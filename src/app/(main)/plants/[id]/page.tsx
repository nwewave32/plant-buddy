export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">식물 상세</h1>
      <p>Plant ID: {id}</p>
      {/* TODO: PlantDetailPage from @/pages/plant-detail */}
    </div>
  );
}
