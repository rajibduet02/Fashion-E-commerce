import { describe, expect, it } from "vitest";
import { cameraAttempts, cameraErrorMessage } from "./camera";

describe("camera startup", () => {
  it("asks for the front camera without requiring that label", () => {
    const [preferred, loose, plain] = cameraAttempts("", "user");
    expect(preferred).toMatchObject({ facingMode: { ideal: "user" }, width: { ideal: 1280 } });
    expect(loose).toEqual({ facingMode: { ideal: "user" } });
    expect(plain).toBe(true);
  });

  it("keeps a chosen camera, then falls back to any camera", () => {
    const attempts = cameraAttempts("cam-1", "environment");
    expect(attempts[0]).toMatchObject({ deviceId: { exact: "cam-1" } });
    expect(attempts[1]).toEqual({ deviceId: { ideal: "cam-1" } });
    expect(attempts[2]).toBe(true);
  });

  it("explains a busy camera separately from a denied permission", () => {
    expect(cameraErrorMessage(new DOMException("busy", "NotReadableError"))).toMatch(/could not start/i);
    expect(cameraErrorMessage(new DOMException("denied", "NotAllowedError"))).toMatch(/permission/i);
  });
});
