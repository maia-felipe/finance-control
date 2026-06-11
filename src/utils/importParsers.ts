// Parsers de extrato bancário para importação: CSV genérico (com mapeamento
// de colunas) e OFX (formato padrão exportado pelos bancos brasileiros).

export interface ParsedTransaction {
  date: string          // yyyy-MM-dd
  amount: number        // sempre positivo (o sinal vira o campo type)
  type: 'income' | 'expense'
  description: string
  externalId?: string   // FITID do OFX — id estável para detecção de duplicatas
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export interface CsvData {
  headers: string[]
  rows: string[][]
}

function detectDelimiter(line: string): string {
  const candidates = [';', ',', '\t']
  let best = ','
  let bestCount = 0
  for (const d of candidates) {
    const count = line.split(d).length - 1
    if (count > bestCount) {
      best = d
      bestCount = count
    }
  }
  return best
}

// Parser CSV com suporte a campos entre aspas (incluindo aspas escapadas e
// quebras de linha dentro de aspas) e detecção automática de , ; ou tab.
export function parseCsv(text: string): CsvData {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.slice(0, clean.indexOf('\n') === -1 ? undefined : clean.indexOf('\n'))
  const delim = detectDelimiter(firstLine)

  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some(f => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.some(f => f.trim() !== '')) rows.push(row)

  if (rows.length === 0) return { headers: [], rows: [] }
  const [headers, ...dataRows] = rows
  return { headers: headers.map(h => h.trim()), rows: dataRows }
}

export type CsvDateFormat = 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy'

export interface CsvMapping {
  dateCol: number
  amountCol: number
  descCol: number
  dateFormat: CsvDateFormat
  // Como interpretar o sinal: pelo sinal do valor, ou forçar tudo como um tipo
  sign: 'auto' | 'all-expense' | 'all-income'
}

// Tenta adivinhar o índice das colunas pelos nomes mais comuns (pt/en).
export function guessCsvMapping(headers: string[]): Pick<CsvMapping, 'dateCol' | 'amountCol' | 'descCol'> {
  const find = (patterns: RegExp[]) =>
    headers.findIndex(h => patterns.some(p => p.test(h.toLowerCase())))
  const dateCol = find([/data/, /date/, /dia/])
  const amountCol = find([/valor/, /amount/, /montante/, /value/, /quantia/])
  const descCol = find([/descri/, /desc/, /hist[oó]rico/, /memo/, /lan[cç]amento/, /title/, /estabelecimento/])
  return {
    dateCol: dateCol === -1 ? 0 : dateCol,
    amountCol: amountCol === -1 ? Math.min(1, headers.length - 1) : amountCol,
    descCol: descCol === -1 ? Math.min(2, headers.length - 1) : descCol,
  }
}

// Interpreta valores como "1.234,56", "-1234.56", "R$ 1.234,56".
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, '').trim()
  if (!s) return null
  const negative = s.startsWith('-')
  s = s.replace(/-/g, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    // vírgula é o separador decimal (formato brasileiro)
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    s = s.replace(/,/g, '')
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

function parseCsvDate(raw: string, fmt: CsvDateFormat): string | null {
  const s = raw.trim().slice(0, 10)
  let y: string, m: string, d: string
  if (fmt === 'yyyy-MM-dd') {
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return null
    ;[, y, m, d] = match
  } else {
    const match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
    if (!match) return null
    if (fmt === 'dd/MM/yyyy') [, d, m, y] = match
    else [, m, d, y] = match
  }
  const month = Number(m), day = Number(d)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function mapCsvRows(data: CsvData, mapping: CsvMapping): { parsed: ParsedTransaction[]; skipped: number } {
  const parsed: ParsedTransaction[] = []
  let skipped = 0
  for (const row of data.rows) {
    const date = parseCsvDate(row[mapping.dateCol] ?? '', mapping.dateFormat)
    const amount = parseAmount(row[mapping.amountCol] ?? '')
    const description = (row[mapping.descCol] ?? '').trim()
    if (!date || amount === null || amount === 0) {
      skipped++
      continue
    }
    const type = mapping.sign === 'all-expense' ? 'expense'
      : mapping.sign === 'all-income' ? 'income'
      : amount < 0 ? 'expense' : 'income'
    parsed.push({ date, amount: Math.abs(amount), type, description: description || 'Importado' })
  }
  return { parsed, skipped }
}

// ---------------------------------------------------------------------------
// OFX
// ---------------------------------------------------------------------------

export function isOfx(text: string): boolean {
  return /<OFX>/i.test(text) || /OFXHEADER/i.test(text)
}

// OFX é SGML: tags podem não ter fechamento (<TRNAMT>-12.34). Extrai os
// blocos <STMTTRN> e lê os campos linha a linha.
export function parseOfx(text: string): ParsedTransaction[] {
  const parsed: ParsedTransaction[] = []
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? []
  for (const block of blocks) {
    const field = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, 'i'))
      return m ? m[1].trim() : ''
    }
    const rawAmount = field('TRNAMT')
    const rawDate = field('DTPOSTED')
    const amount = parseAmount(rawAmount)
    const dateMatch = rawDate.match(/^(\d{4})(\d{2})(\d{2})/)
    if (amount === null || amount === 0 || !dateMatch) continue
    const [, y, m, d] = dateMatch
    const description = field('MEMO') || field('NAME') || 'Importado'
    const fitId = field('FITID')
    parsed.push({
      date: `${y}-${m}-${d}`,
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
      description,
      externalId: fitId || undefined,
    })
  }
  return parsed
}
