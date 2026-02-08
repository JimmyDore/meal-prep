describe("Environment", () => {
  it("should run a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("should have NODE_ENV defined in test", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });
});
