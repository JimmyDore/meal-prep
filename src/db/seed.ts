import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ingredients, recipeIngredients, recipes, recipeTags, tags } from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { casing: "snake_case" });

async function seed() {
  console.log("Seeding database...");

  // --- Recipes ---
  const [pouletGrille, patesBolo, saladeCesar] = await db
    .insert(recipes)
    .values([
      {
        jowId: "poulet-grille-aux-legumes",
        title: "Poulet Grille aux Legumes",
        imageUrl: "https://img.jow.fr/poulet-grille-aux-legumes.jpg",
        jowUrl: "https://jow.fr/recettes/poulet-grille-aux-legumes",
        cookTimeMin: 35,
        originalPortions: 4,
      },
      {
        jowId: "pates-bolognaise",
        title: "Pates Bolognaise",
        imageUrl: "https://img.jow.fr/pates-bolognaise.jpg",
        jowUrl: "https://jow.fr/recettes/pates-bolognaise",
        cookTimeMin: 25,
        originalPortions: 4,
      },
      {
        jowId: "salade-cesar",
        title: "Salade Cesar",
        imageUrl: "https://img.jow.fr/salade-cesar.jpg",
        jowUrl: "https://jow.fr/recettes/salade-cesar",
        cookTimeMin: 15,
        originalPortions: 2,
      },
    ])
    .onConflictDoNothing()
    .returning();

  if (!pouletGrille || !patesBolo || !saladeCesar) {
    console.log("Recipes already exist, skipping seed (idempotent).");
    await client.end();
    return;
  }

  console.log(`Inserted ${3} recipes`);

  // --- Ingredients ---
  const [poulet, pates, tomate, laitue, parmesan, oignon, ail, courgette, boeufHache, croutons] =
    await db
      .insert(ingredients)
      .values([
        {
          name: "Poulet (blanc)",
          caloriesPer100g: 165,
          proteinPer100g: 31,
          carbsPer100g: 0,
          fatPer100g: 3.6,
        },
        {
          name: "Pates",
          caloriesPer100g: 131,
          proteinPer100g: 5,
          carbsPer100g: 25,
          fatPer100g: 1.1,
        },
        {
          name: "Tomate",
          caloriesPer100g: 18,
          proteinPer100g: 0.9,
          carbsPer100g: 3.9,
          fatPer100g: 0.2,
        },
        {
          name: "Laitue",
          caloriesPer100g: 15,
          proteinPer100g: 1.4,
          carbsPer100g: 2.9,
          fatPer100g: 0.2,
        },
        {
          name: "Parmesan",
          caloriesPer100g: 431,
          proteinPer100g: 38,
          carbsPer100g: 4.1,
          fatPer100g: 29,
        },
        {
          name: "Oignon",
          caloriesPer100g: 40,
          proteinPer100g: 1.1,
          carbsPer100g: 9.3,
          fatPer100g: 0.1,
        },
        {
          name: "Ail",
          caloriesPer100g: 149,
          proteinPer100g: 6.4,
          carbsPer100g: 33,
          fatPer100g: 0.5,
        },
        {
          name: "Courgette",
          caloriesPer100g: 17,
          proteinPer100g: 1.2,
          carbsPer100g: 3.1,
          fatPer100g: 0.3,
        },
        {
          name: "Boeuf hache",
          caloriesPer100g: 254,
          proteinPer100g: 17,
          carbsPer100g: 0,
          fatPer100g: 20,
        },
        {
          name: "Croutons",
          caloriesPer100g: 407,
          proteinPer100g: 12,
          carbsPer100g: 64,
          fatPer100g: 11,
        },
      ])
      .onConflictDoNothing()
      .returning();

  console.log(`Inserted ${10} ingredients`);

  // --- Recipe Ingredients ---
  // Poulet Grille aux Legumes
  await db
    .insert(recipeIngredients)
    .values([
      {
        recipeId: pouletGrille.id,
        ingredientId: poulet.id,
        quantity: 500,
        unit: "g",
        originalText: "500g de blanc de poulet",
      },
      {
        recipeId: pouletGrille.id,
        ingredientId: courgette.id,
        quantity: 2,
        unit: "piece",
        originalText: "2 courgettes",
      },
      {
        recipeId: pouletGrille.id,
        ingredientId: oignon.id,
        quantity: 1,
        unit: "piece",
        originalText: "1 oignon",
      },
      {
        recipeId: pouletGrille.id,
        ingredientId: ail.id,
        quantity: 2,
        unit: "gousse",
        originalText: "2 gousses d'ail",
      },
    ])
    .onConflictDoNothing();

  // Pates Bolognaise
  await db
    .insert(recipeIngredients)
    .values([
      {
        recipeId: patesBolo.id,
        ingredientId: pates.id,
        quantity: 400,
        unit: "g",
        originalText: "400g de pates",
      },
      {
        recipeId: patesBolo.id,
        ingredientId: boeufHache.id,
        quantity: 300,
        unit: "g",
        originalText: "300g de boeuf hache",
      },
      {
        recipeId: patesBolo.id,
        ingredientId: tomate.id,
        quantity: 400,
        unit: "g",
        originalText: "400g de tomates pelees",
      },
      {
        recipeId: patesBolo.id,
        ingredientId: oignon.id,
        quantity: 1,
        unit: "piece",
        originalText: "1 oignon",
      },
    ])
    .onConflictDoNothing();

  // Salade Cesar
  await db
    .insert(recipeIngredients)
    .values([
      {
        recipeId: saladeCesar.id,
        ingredientId: laitue.id,
        quantity: 1,
        unit: "piece",
        originalText: "1 laitue romaine",
      },
      {
        recipeId: saladeCesar.id,
        ingredientId: poulet.id,
        quantity: 200,
        unit: "g",
        originalText: "200g de blanc de poulet",
      },
      {
        recipeId: saladeCesar.id,
        ingredientId: parmesan.id,
        quantity: 50,
        unit: "g",
        originalText: "50g de parmesan rape",
      },
      {
        recipeId: saladeCesar.id,
        ingredientId: croutons.id,
        quantity: 60,
        unit: "g",
        originalText: "60g de croutons",
      },
    ])
    .onConflictDoNothing();

  console.log("Linked ingredients to recipes");

  // --- Tags ---
  const [volaille, rapide, salade, patesTag] = await db
    .insert(tags)
    .values([
      { name: "Volaille", slug: "volaille" },
      { name: "Rapide", slug: "rapide" },
      { name: "Salade", slug: "salade" },
      { name: "Pates", slug: "pates" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${4} tags`);

  // --- Recipe Tags ---
  await db
    .insert(recipeTags)
    .values([
      { recipeId: pouletGrille.id, tagId: volaille.id },
      { recipeId: saladeCesar.id, tagId: volaille.id },
      { recipeId: saladeCesar.id, tagId: rapide.id },
      { recipeId: saladeCesar.id, tagId: salade.id },
      { recipeId: patesBolo.id, tagId: patesTag.id },
    ])
    .onConflictDoNothing();

  console.log("Linked tags to recipes");

  await client.end();
  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
