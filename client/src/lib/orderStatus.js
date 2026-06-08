export function displayOrderStatus(status = '') {
  if (status === 'pending_payment') return 'Pending';
  if (status === 'paid' || status === 'processing') return 'Processing';
  if (status === 'completed') return 'Complete';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Cancelled';
  return status || 'Pending';
}

