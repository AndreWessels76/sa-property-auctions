import ImportTable from "./components/ImportTable";
import ImportQueue from "./components/ImportQueue";
import ImportSummary from "./components/ImportSummary";

export default function ImportsPage() {
  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Import Centre</h1>

      <ImportSummary />

      <div className="mt-8">
        <ImportQueue />
      </div>

      <div className="mt-8">
        <ImportTable />
      </div>
    </div>
  );
}
