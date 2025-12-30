/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsCard } from "../components/stats-card";
import { FileText } from "lucide-react";

describe("StatsCard", () => {
  it("should render title and value", () => {
    render(
      <StatsCard
        title="Total Scripts"
        value={42}
        icon={FileText}
      />
    );

    expect(screen.getByText("Total Scripts")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(
      <StatsCard
        title="Scripts Today"
        value={10}
        icon={FileText}
        description="Generated in the last 24 hours"
      />
    );

    expect(screen.getByText("Generated in the last 24 hours")).toBeInTheDocument();
  });

  it("should not render description when not provided", () => {
    render(
      <StatsCard
        title="Scripts Today"
        value={10}
        icon={FileText}
      />
    );

    expect(screen.queryByText("Generated in the last 24 hours")).not.toBeInTheDocument();
  });

  it("should show skeleton when loading", () => {
    render(
      <StatsCard
        title="Loading Stats"
        value={0}
        icon={FileText}
        isLoading={true}
      />
    );

    expect(screen.getByText("Loading Stats")).toBeInTheDocument();
    // Value should not be shown when loading
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should show value when not loading", () => {
    render(
      <StatsCard
        title="Ready Stats"
        value={100}
        icon={FileText}
        isLoading={false}
      />
    );

    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should handle string values", () => {
    render(
      <StatsCard
        title="Status"
        value="Active"
        icon={FileText}
      />
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should have correct test id based on title", () => {
    render(
      <StatsCard
        title="Total Scripts"
        value={42}
        icon={FileText}
      />
    );

    expect(screen.getByTestId("card-stat-total-scripts")).toBeInTheDocument();
    expect(screen.getByTestId("text-stat-value-total-scripts")).toBeInTheDocument();
  });

  it("should handle titles with special characters", () => {
    render(
      <StatsCard
        title="Scripts Used This Week"
        value={25}
        icon={FileText}
      />
    );

    expect(screen.getByTestId("card-stat-scripts-used-this-week")).toBeInTheDocument();
  });
});
