import { screen } from "@testing-library/react";
// import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import {
  createTestAdapter,
  renderWithSearchProvider,
  useCreateUrlSearchParams,
} from "./testHelpers";

function DisplayUrl({ overrides }: { overrides?: Record<string, any> }) {
  const createUrlSearchParams = useCreateUrlSearchParams();
  return <div data-testid="output">{createUrlSearchParams(overrides).toString()}</div>;
}

describe("useCreateUrlSearchParams", () => {
  it("creates a URLSearchParams string from current validated state", () => {
    const adapter = createTestAdapter("?page=3&tab=preview");
    renderWithSearchProvider(<DisplayUrl />, adapter);
    expect(screen.getByTestId("output").textContent).toBe("page=3&tab=preview");
  });

  it("respects overrides passed to the hook", () => {
    const adapter = createTestAdapter("?page=2&tab=preview");
  
    const TestComponent = () => {
      const createUrlSearchParams = useCreateUrlSearchParams();
      return <div data-testid="output">{createUrlSearchParams({ page: 5 }).toString()}</div>;
    };
  
    renderWithSearchProvider(<TestComponent />, adapter);
  
    expect(screen.getByTestId("output").textContent).toBe("page=5&tab=preview");
  });
  
});
