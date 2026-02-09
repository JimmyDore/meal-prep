import { describe, expect, it } from "vitest";
import { convertToGrams, DEFAULT_PIECE_WEIGHT } from "../unit-conversion";

describe("convertToGrams", () => {
  describe("direct unit conversions", () => {
    it("converts Kilogramme to grams", () => {
      expect(convertToGrams(0.15, "Kilogramme", "Poulet")).toBe(150);
    });

    it("converts Litre to grams", () => {
      expect(convertToGrams(2, "Litre", "Eau")).toBe(2000);
    });

    it("converts Cuillere a soupe (accented) to grams", () => {
      expect(convertToGrams(3, "Cuill\u00e8re \u00e0 soupe", "Huile")).toBe(45);
    });

    it("converts Cuillere a cafe (accented) to grams", () => {
      expect(convertToGrams(1, "Cuill\u00e8re \u00e0 caf\u00e9", "Sel")).toBe(5);
    });

    it("converts Gousse to grams", () => {
      expect(convertToGrams(2, "Gousse", "Ail")).toBe(10);
    });

    it("converts Pinc\u00e9e to grams", () => {
      expect(convertToGrams(1, "Pinc\u00e9e", "Sel")).toBe(0.5);
    });

    it("converts Bouquet to grams", () => {
      expect(convertToGrams(1, "Bouquet", "Persil")).toBe(25);
    });

    it("converts Brin to grams", () => {
      expect(convertToGrams(3, "Brin", "Thym")).toBe(6);
    });

    it("converts Noisette to grams", () => {
      expect(convertToGrams(2, "Noisette", "Beurre")).toBe(10);
    });

    it("converts Poign\u00e9e to grams", () => {
      expect(convertToGrams(1, "Poign\u00e9e", "Riz")).toBe(30);
    });

    it("converts Tranche to grams", () => {
      expect(convertToGrams(2, "Tranche", "Pain")).toBe(60);
    });

    it("converts Boule to grams", () => {
      expect(convertToGrams(1, "Boule", "Mozzarella")).toBe(60);
    });

    it("converts Centim\u00e8tre to grams", () => {
      expect(convertToGrams(3, "Centim\u00e8tre", "Gingembre")).toBe(15);
    });

    it("converts Sachet to grams", () => {
      expect(convertToGrams(1, "Sachet", "Levure")).toBe(10);
    });

    it("converts Quartier to grams", () => {
      expect(convertToGrams(2, "Quartier", "Orange")).toBe(60);
    });

    it("converts Portion to grams", () => {
      expect(convertToGrams(1, "Portion", "Riz")).toBe(100);
    });

    it("converts Leaf to grams", () => {
      expect(convertToGrams(5, "Leaf", "Basilic")).toBe(5);
    });
  });

  describe("piece lookups with accent-stripped matching", () => {
    it("looks up Oeuf (egg) piece weight", () => {
      expect(convertToGrams(2, "Pi\u00e8ce", "Oeuf")).toBe(110);
    });

    it("looks up Oignon jaune by substring match", () => {
      expect(convertToGrams(1, "Pi\u00e8ce", "Oignon jaune")).toBe(100);
    });

    it("looks up Tomates cerises (plural) matching tomate cerise", () => {
      expect(convertToGrams(3, "Pi\u00e8ce", "Tomates cerises")).toBe(45);
    });

    it("looks up Pomme de terre", () => {
      expect(convertToGrams(1, "Pi\u00e8ce", "Pomme de terre")).toBe(140);
    });

    it("matches Citron vert before Citron (longest key first)", () => {
      expect(convertToGrams(1, "Pi\u00e8ce", "Citron vert")).toBe(100);
    });

    it("matches Citron when not Citron vert", () => {
      expect(convertToGrams(1, "Pi\u00e8ce", "Citron")).toBe(120);
    });

    it("looks up Avocat", () => {
      expect(convertToGrams(2, "Pi\u00e8ce", "Avocat")).toBe(400);
    });

    it("looks up Carotte", () => {
      expect(convertToGrams(3, "Pi\u00e8ce", "Carotte")).toBe(375);
    });

    it("looks up Escalope", () => {
      expect(convertToGrams(2, "Pi\u00e8ce", "Escalope de poulet")).toBe(300);
    });

    it("looks up Mangue", () => {
      expect(convertToGrams(1, "Pi\u00e8ce", "Mangue")).toBe(400);
    });
  });

  describe("accented ingredient names", () => {
    it("matches \u00c9chalote (accented) to echalote entry", () => {
      expect(convertToGrams(2, "Pi\u00e8ce", "\u00c9chalote")).toBe(50);
    });

    it("matches P\u00eache (accented) to peche entry", () => {
      expect(convertToGrams(1, "Pi\u00e8ce", "P\u00eache")).toBe(150);
    });
  });

  describe("unknown piece fallback", () => {
    it("returns DEFAULT_PIECE_WEIGHT for unknown ingredient", () => {
      expect(convertToGrams(1, "Pi\u00e8ce", "SomeUnknownIngredient")).toBe(DEFAULT_PIECE_WEIGHT);
    });

    it("returns quantity * DEFAULT_PIECE_WEIGHT for multiple unknown pieces", () => {
      expect(convertToGrams(3, "Pi\u00e8ce", "IngredientInconnu")).toBe(300);
    });
  });

  describe("unknown unit", () => {
    it("returns null for unrecognized unit", () => {
      expect(convertToGrams(1, "UnknownUnit", "Something")).toBeNull();
    });

    it("returns null for empty string unit", () => {
      expect(convertToGrams(1, "", "Something")).toBeNull();
    });
  });

  describe("null unit", () => {
    it("returns null when unit is null", () => {
      expect(convertToGrams(1, null, "Poulet")).toBeNull();
    });
  });

  describe("unaccented unit variants", () => {
    it("converts Pincee (unaccented) to grams", () => {
      expect(convertToGrams(2, "Pincee", "Sel")).toBe(1);
    });

    it("converts Cuillere a soupe (unaccented) to grams", () => {
      expect(convertToGrams(1, "Cuillere a soupe", "Miel")).toBe(15);
    });

    it("converts Cuillere a cafe (unaccented) to grams", () => {
      expect(convertToGrams(1, "Cuillere a cafe", "Vanille")).toBe(5);
    });

    it("converts Poignee (unaccented) to grams", () => {
      expect(convertToGrams(1, "Poignee", "Noix")).toBe(30);
    });

    it("converts Piece (unaccented) as piece lookup", () => {
      expect(convertToGrams(1, "Piece", "Banane")).toBe(150);
    });
  });
});
