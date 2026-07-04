import { Spinner } from "@/components/ui/spinner";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner className="h-6 w-6 text-rose" />
    </div>
  );
}
