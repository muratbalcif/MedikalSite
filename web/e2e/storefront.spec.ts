import { test, expect } from "@playwright/test";

test.describe("Public storefront", () => {
  test("homepage opens", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByText("ANAMUR ACİL MEDİKAL").first()).toBeVisible();
  });

  test("products list opens", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Ürünler" })).toBeVisible();
  });

  test("search page works", async ({ page }) => {
    await page.goto("/search?q=test");
    await expect(page.getByRole("heading", { name: "Arama" })).toBeVisible();
  });

  test("login form works", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Giriş" })).toBeVisible();
    await page.getByLabel("E-posta").fill("not-a-user@example.com");
    await page.getByLabel("Şifre").fill("Password123!");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByRole("button", { name: /Giriş/ })).toBeVisible();
  });

  test("register validation works", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Kayıt ol" }).click();
    await expect(page.getByPlaceholder("Ad", { exact: true })).toBeVisible();
  });

  test("guest cart redirects or asks login", async ({ page }) => {
    await page.goto("/cart");
    await expect(
      page.getByText(/Sepet|giriş|boş/i).first(),
    ).toBeVisible();
  });

  test("protected account redirects guest to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/account");
    await expect(page).toHaveURL(/login/);
  });

  test("checkout redirects guest to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/checkout");
    await expect(page).toHaveURL(/login/);
  });

  test("category route renders or 404 gracefully", async ({ page }) => {
    const response = await page.goto("/categories/nonexistent-slug-xyz");
    expect(response?.status()).toBeLessThan(500);
  });

  test("product detail 404 is handled", async ({ page }) => {
    const response = await page.goto("/products/nonexistent-product-xyz");
    expect(response?.status()).toBeLessThan(500);
  });
});
