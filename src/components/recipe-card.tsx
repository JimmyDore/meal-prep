import { ChefHat, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecipeWithTags } from "@/db/queries/recipes";

interface RecipeCardProps {
  recipe: RecipeWithTags;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-lg">
        {recipe.imageUrl ? (
          <div className="relative aspect-square w-full">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square w-full bg-muted" />
        )}

        <CardHeader className="pb-0">
          <CardTitle className="line-clamp-2 text-sm">{recipe.title}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-2 pb-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {recipe.totalTimeMin != null && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {recipe.totalTimeMin} min
              </span>
            )}
            {recipe.difficulty && (
              <span className="flex items-center gap-1">
                <ChefHat className="size-3.5" />
                {recipe.difficulty}
              </span>
            )}
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-[10px]">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
