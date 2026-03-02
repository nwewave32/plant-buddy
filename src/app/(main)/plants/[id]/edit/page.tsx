export default async function PlantEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">식물 수정</h1>
      <p>Plant ID: {id}</p>
      {/* TODO: PlantFormPage from @/pages/plant-form */}
    </div>
  );
}
