/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "../pages/not-found";

describe("NotFound Page", () => {
  it("should render 404 heading", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404 Page Not Found");
  });

  it("should render helpful message", () => {
    render(<NotFound />);

    expect(screen.getByText(/Did you forget to add the page to the router/i)).toBeInTheDocument();
  });

  it("should render alert icon", () => {
    render(<NotFound />);

    // The AlertCircle icon should be rendered
    const icon = document.querySelector(".text-red-500");
    expect(icon).toBeInTheDocument();
  });
});
