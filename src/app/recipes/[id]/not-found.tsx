import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RecipeNotFound() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Recette introuvable</h1>
      <p className="mt-4 text-muted-foreground">
        Cette recette n&apos;existe pas ou a ete supprimee.
      </p>
      <Button asChild className="mt-6">
        <Link href="/recipes">Retour au catalogue</Link>
      </Button>
    </div>
  );
}
