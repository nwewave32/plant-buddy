import { redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { PlantFormPage } from '@/views/plant-form';

export default async function PlantNewRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (profile?.role !== 'admin') {
    redirect('/plants');
  }

  return <PlantFormPage />;
}
