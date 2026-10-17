import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** /studio/checkout on its own has nothing to show: packs are picked on the pricing page. */
export default function CheckoutIndexPage() {
  redirect('/studio/pricing');
}
