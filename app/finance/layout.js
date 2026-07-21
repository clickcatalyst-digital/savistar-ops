import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth';

// Server-side gate so direct navigation to /finance can't bypass the hidden nav link.
export default function FinanceLayout({ children }) {
  const user = getSessionUser();
  if (isStaff(user)) redirect('/');
  return children;
}
