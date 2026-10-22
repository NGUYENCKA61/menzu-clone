import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  callbackSign,
  chargingSign,
  checkSign,
  readTsrResult,
  telcoFor,
  verdictOf,
} from "@/lib/theSieuReRules";

const md5 = (text: string) => createHash("md5").update(text).digest("hex");

describe("TheSieuRe signatures (their Tài liệu API, charging v2)", () => {
  it("signs a charging call as key . code . command . partner . request . serial . telco", () => {
    const sign = chargingSign({
      partnerKey: "KEY",
      partnerId: "PID",
      requestId: "NT1",
      code: "CODE",
      serial: "SER",
      telco: "VIETTEL",
    });
    expect(sign).toBe(md5("KEYCODEchargingPIDNT1SERVIETTEL"));
  });

  it("signs a check call as key . command . partner . request", () => {
    expect(checkSign({ partnerKey: "KEY", partnerId: "PID", requestId: "NT1" })).toBe(
      md5("KEYcheckPIDNT1"),
    );
  });

  it("expects their answers signed as key . code . serial", () => {
    expect(callbackSign("KEY", "CODE", "SER")).toBe(md5("KEYCODESER"));
  });
});

describe("telcoFor", () => {
  it("spells the form's carriers their way", () => {
    expect(telcoFor("Viettel")).toBe("VIETTEL");
    expect(telcoFor("Vinaphone")).toBe("VINAPHONE");
    expect(telcoFor("Mobifone")).toBe("MOBIFONE");
    expect(telcoFor("Garena")).toBe("GARENA");
    expect(telcoFor("Zing")).toBe("ZING");
    expect(telcoFor("Vietnamobile")).toBe("VNMOBI");
  });

  it("refuses what they do not list", () => {
    expect(telcoFor("Gate")).toBeNull();
    expect(telcoFor(null)).toBeNull();
  });
});

describe("readTsrResult", () => {
  it("reads the documented success reply", () => {
    const result = readTsrResult({
      trans_id: 123456,
      request_id: "NAPTHE_20260403_001",
      amount: 81000,
      value: 100000,
      declared_value: 100000,
      telco: "VIETTEL",
      serial: "10006139342354",
      code: "114384960423544",
      status: 1,
      callback_sign: "1d55e0d5f8b4e8f815a3efbb9f5c7b21",
      message: "VALID_CARD",
    });
    expect(result).toEqual({
      status: 1,
      message: "VALID_CARD",
      requestId: "NAPTHE_20260403_001",
      transId: "123456",
      value: 100000,
      declaredValue: 100000,
      amount: 81000,
      code: "114384960423544",
      serial: "10006139342354",
      callbackSign: "1d55e0d5f8b4e8f815a3efbb9f5c7b21",
    });
  });

  it("reads a request-level error and refuses what is not an answer", () => {
    expect(readTsrResult({ status: 102, message: "sai sign" })).toMatchObject({
      status: 102,
      requestId: "",
      transId: "",
    });
    // Strings are how a form arrives.
    expect(readTsrResult({ status: "99", declared_value: "100000" })).toMatchObject({
      status: 99,
      declaredValue: 100000,
    });
    expect(readTsrResult(null)).toBeNull();
    expect(readTsrResult({ message: "no status" })).toBeNull();
  });
});

describe("verdictOf", () => {
  it("pays on 1 and 2, waits on 99, refuses on 3, leaves the rest to the desk", () => {
    expect(verdictOf(1)).toBe("paid");
    expect(verdictOf(2)).toBe("paid-other-value");
    expect(verdictOf(99)).toBe("pending");
    expect(verdictOf(3)).toBe("refused");
    expect(verdictOf(4)).toBe("down");
    expect(verdictOf(102)).toBe("down");
  });
});
