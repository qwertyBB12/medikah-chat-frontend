import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DoctorOnboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/physicians/onboard');
  }, [router]);
  return null;
}
