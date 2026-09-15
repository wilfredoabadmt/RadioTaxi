/**
 * Utilidades para Facturación Fiscal Boliviana conforme a normativa SIN (Servicio de Impuestos Nacionales)
 * y Código de Control v7 / SIAT.
 */

// Tablas de multiplicación y permutación para el Algoritmo Verhoeff
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Calcula el dígito Verhoeff de una cadena numérica
 */
export function calcVerhoeff(numStr: string): string {
  let c = 0;
  const len = numStr.length;
  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(len - i - 1), 10);
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digit]];
  }
  return String(VERHOEFF_INV[c]);
}

/**
 * Añade N dígitos Verhoeff a un número
 */
export function addVerhoeffDigits(numStr: string, count = 2): string {
  let current = numStr;
  for (let i = 0; i < count; i++) {
    current += calcVerhoeff(current);
  }
  return current;
}

/**
 * Cifrado AllegedRC4 para Código de Control SIN Bolivia
 */
export function allegedRC4(message: string, key: string): string {
  const state: number[] = [];
  for (let i = 0; i < 256; i++) {
    state[i] = i;
  }

  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + state[i] + key.charCodeAt(i % key.length)) % 256;
    const temp = state[i];
    state[i] = state[j];
    state[j] = temp;
  }

  let i = 0;
  j = 0;
  let cipherText = '';

  for (let k = 0; k < message.length; k++) {
    i = (i + 1) % 256;
    j = (j + state[i]) % 256;
    const temp = state[i];
    state[i] = state[j];
    state[j] = temp;

    const charCode = message.charCodeAt(k) ^ state[(state[i] + state[j]) % 256];
    let hex = charCode.toString(16).toUpperCase();
    if (hex.length === 1) hex = '0' + hex;
    cipherText += hex;
  }

  return cipherText;
}

/**
 * Genera el Código de Control Boliviano v7 (e.g. 7B-1A-D4-F5-2C)
 */
export function generateBolivianControlCode(
  authNumber: string,
  invoiceNumber: string,
  clientNit: string,
  dateFormatted: string, // YYYYMMDD
  totalAmountRounded: string,
  dosageKey = '9rCB79q2Kp-6AlnbSmxzB89(yyxTVI7Dew3bv72GeDe2_G33a94st34A'
): string {
  // 1. Añadir 2 dígitos Verhoeff a cada campo
  const authV = addVerhoeffDigits(authNumber, 2);
  const invV = addVerhoeffDigits(invoiceNumber, 2);
  const nitV = addVerhoeffDigits(clientNit, 2);
  const dateV = addVerhoeffDigits(dateFormatted, 2);
  const amountV = addVerhoeffDigits(totalAmountRounded, 2);

  // 2. Sumar campos y obtener 5 dígitos Verhoeff del total
  const sumFields = (
    BigInt(authV) +
    BigInt(invV) +
    BigInt(nitV) +
    BigInt(dateV) +
    BigInt(amountV)
  ).toString();

  let verhoeff5 = '';
  let sumCopy = sumFields;
  for (let i = 0; i < 5; i++) {
    const vDigit = calcVerhoeff(sumCopy);
    verhoeff5 += vDigit;
    sumCopy += vDigit;
  }

  // 3. Tomar subcadenas de la llave según los 5 dígitos
  const limits = verhoeff5.split('').map((d) => parseInt(d, 10) + 1);
  let idx = 0;
  const substrings: string[] = [];
  for (const limit of limits) {
    substrings.push(dosageKey.substring(idx, idx + limit));
    idx += limit;
  }

  // 4. Concatenar mensaje con las subcadenas intercaladas
  const message =
    authNumber + substrings[0] +
    invoiceNumber + substrings[1] +
    clientNit + substrings[2] +
    dateFormatted + substrings[3] +
    totalAmountRounded + substrings[4];

  // 5. Aplicar AllegedRC4 con la llave completa + 5 dígitos Verhoeff
  const cipherKey = dosageKey + verhoeff5;
  const hexResult = allegedRC4(message, cipherKey);

  // 6. Formatear con guiones de 2 en 2 caracteres (primeros 10 caracteres)
  const truncatedHex = hexResult.substring(0, 10);
  const pairs: string[] = [];
  for (let i = 0; i < truncatedHex.length; i += 2) {
    pairs.push(truncatedHex.substring(i, i + 2));
  }

  return pairs.join('-');
}

/**
 * Formatea el texto para el código QR del SIN Bolivia
 */
export function generateSinQrPayload(params: {
  nitEmisor: string;
  invoiceNumber: string;
  authNumber: string;
  dateStr: string; // YYYY-MM-DD
  total: number;
  baseCreditoFiscal: number;
  controlCode: string;
  clientNit: string;
}): string {
  const {
    nitEmisor,
    invoiceNumber,
    authNumber,
    dateStr,
    total,
    baseCreditoFiscal,
    controlCode,
    clientNit,
  } = params;

  // Formato oficial SIN:
  // NIT_EMISOR|NRO_FACTURA|NRO_AUTORIZACION|FECHA|TOTAL|BASE_CF|COD_CONTROL|NIT_CLIENTE|ICE|VENTAS_NO_GRAVADAS|NO_SUJETO_CF|DESCUENTOS
  return [
    nitEmisor,
    invoiceNumber,
    authNumber,
    dateStr,
    total.toFixed(2),
    baseCreditoFiscal.toFixed(2),
    controlCode,
    clientNit || '0',
    '0.00', // ICE / IEHD
    '0.00', // Ventas no gravadas
    '0.00', // No sujeto a CF
    '0.00', // Descuentos
  ].join('|');
}
