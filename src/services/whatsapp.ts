import { BusinessEntity, Customer, Dispatch, Product } from '../types/dairy';

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatIndianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export interface GenerateWhatsAppBillParams {
  entity?: BusinessEntity;
  customer?: Customer;
  dispatch: Dispatch;
  products: Product[];
  yesterdayDispatch?: Dispatch;
  isRevised?: boolean;
  mode?: 'concise' | 'detailed';
}

export function generateWhatsAppBillText(params: GenerateWhatsAppBillParams): string {
  const { entity, customer, dispatch, products, yesterdayDispatch, isRevised, mode = 'detailed' } = params;
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const billTitle = isRevised || (dispatch.revisionNumber && dispatch.revisionNumber > 1)
    ? '📝 *UPDATED DELIVERY BILL*'
    : '🥛 *DAILY DAIRY DELIVERY BILL*';

  let text = `${billTitle}\n`;
  if (entity?.name) {
    text += `*${entity.name.toUpperCase()}*\n`;
  }
  text += `------------------------------------\n`;
  text += `📅 *Date:* ${formatIndianDate(dispatch.dispatchDate)}\n`;
  text += `📄 *Bill No:* ${dispatch.billNumber}${dispatch.revisionNumber && dispatch.revisionNumber > 1 ? ` (Rev #${dispatch.revisionNumber})` : ''}\n`;
  if (customer?.name) {
    text += `👤 *Customer:* ${customer.name}\n`;
  }
  text += `------------------------------------\n`;

  // 1. TODAY'S BILL DETAILS
  text += `📦 *TODAY'S BILL DETAILS:*\n`;
  if (dispatch.lines && dispatch.lines.length > 0) {
    dispatch.lines.forEach((line, index) => {
      const product = prodMap.get(line.productId);
      const prodName = product ? product.name : 'Dairy Item';
      const unit = product ? product.unit : '';

      text += `${index + 1}. *${prodName}*\n`;
      text += `   Qty: ${line.billedQuantity} ${unit} × ₹${line.rate.toFixed(2)} = *₹${line.lineAmount.toFixed(2)}*\n`;
      if (line.complimentaryQuantity > 0) {
        text += `   🎁 Free Sample: ${line.complimentaryQuantity} ${unit}\n`;
      }
    });
  } else {
    text += `   No items delivered\n`;
  }

  if (dispatch.discount > 0) {
    text += `Gross: ₹${dispatch.grossAmount.toFixed(2)} | Discount: -₹${dispatch.discount.toFixed(2)}\n`;
  }
  text += `*Today's Bill Total:* *₹${dispatch.netAmount.toFixed(2)}*\n`;
  text += `------------------------------------\n`;

  // 2. YESTERDAY'S BILL DETAILS
  text += `⏮️ *YESTERDAY'S BILL DETAILS:*\n`;
  if (yesterdayDispatch) {
    text += `📅 Date: ${formatIndianDate(yesterdayDispatch.dispatchDate)} (Bill #${yesterdayDispatch.billNumber})\n`;
    if (yesterdayDispatch.lines && yesterdayDispatch.lines.length > 0) {
      const lineSummaries = yesterdayDispatch.lines.map((l) => {
        const prod = prodMap.get(l.productId);
        const name = prod ? prod.name : 'Item';
        const unit = prod ? prod.unit : '';
        return `${name}: ${l.billedQuantity} ${unit}`;
      });
      text += `   Items: ${lineSummaries.join(', ')}\n`;
    }
    text += `*Yesterday's Bill Total:* *₹${yesterdayDispatch.netAmount.toFixed(2)}*\n`;
  } else {
    text += `*Yesterday's Bill Total:* *₹0.00* (No delivery recorded)\n`;
  }
  text += `------------------------------------\n`;

  // 3. COLLECTED AMOUNT
  text += `💵 *COLLECTED AMOUNT TODAY:* *₹${dispatch.paymentReceived.toFixed(2)}*\n`;
  if (dispatch.paymentReceived > 0) {
    let modeText = 'Cash';
    if (dispatch.paymentMode === 'ONLINE') {
      modeText = `Online UPI${dispatch.referenceNumber ? ` (#${dispatch.referenceNumber})` : ''}`;
    } else if (dispatch.paymentMode === 'SPLIT') {
      modeText = `Split: Cash ₹${dispatch.cashAmount || 0} + Online ₹${dispatch.onlineAmount || 0}`;
    }
    text += `   Payment Mode: ${modeText}\n`;
  }
  text += `------------------------------------\n`;

  // 4. TOTAL REMAINING AMOUNT & BALANCE BREAKDOWN
  text += `📊 *ACCOUNT BALANCE SUMMARY:*\n`;
  text += `   Previous Pending: ₹${dispatch.previousOutstanding.toFixed(2)}\n`;
  text += `   + Today's Bill: ₹${dispatch.netAmount.toFixed(2)}\n`;
  text += `   - Collected Today: ₹${dispatch.paymentReceived.toFixed(2)}\n`;
  text += `------------------------------------\n`;
  text += `⚠️ *TOTAL REMAINING AMOUNT:* *₹${dispatch.closingOutstanding.toFixed(2)}*\n`;
  text += `------------------------------------\n`;

  if (entity?.upiId) {
    text += `💳 Pay via UPI: *${entity.upiId}*\n`;
  }
  text += `Thank you for your business! 🙏`;

  return text;
}

export function getWhatsAppShareUrl(mobileNumber?: string, messageText: string = ''): string {
  const clean = (mobileNumber || '').replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(messageText);

  if (!clean) {
    // When no phone number, open WhatsApp with text ready to choose recipient
    return `https://wa.me/?text=${encoded}`;
  }

  let finalNumber = clean;
  if (clean.length === 10) {
    finalNumber = `91${clean}`;
  }
  return `https://wa.me/${finalNumber}?text=${encoded}`;
}
