import { describe, expect, it } from "vitest";

import {
  fillShortlinkTemplate,
  readShortlinkResponse,
  shortlinkConfigured,
} from "@/lib/shortlink";

/**
 * The shortlink service is whatever the admin pasted: a template with {api}
 * and {url}, and an answer in one of a few shapes. What matters is that the
 * fill escapes the long URL and that every usual answer shape is read.
 */
describe("the admin's template", () => {
  it("is usable once it has a {url} slot and a key where {api} asks for one", () => {
    expect(
      shortlinkConfigured({ shortlinkApiTemplate: "", shortlinkApiKey: "" }),
    ).toBe(false);
    expect(
      shortlinkConfigured({
        shortlinkApiTemplate: "https://s.example/api?api={api}&url={url}",
        shortlinkApiKey: "",
      }),
    ).toBe(false);
    expect(
      shortlinkConfigured({
        shortlinkApiTemplate: "https://s.example/api?api={api}&url={url}",
        shortlinkApiKey: "k",
      }),
    ).toBe(true);
    // A service whose key sits in the path needs no {api} at all.
    expect(
      shortlinkConfigured({
        shortlinkApiTemplate: "https://s.example/abc/shorten?url={url}",
        shortlinkApiKey: "",
      }),
    ).toBe(true);
  });

  it("fills the key and the long URL, escaped", () => {
    expect(
      fillShortlinkTemplate(
        " https://s.example/api?api={api}&url={url} ",
        "k 1",
        "https://thichthihack.com/free-key/abc?x=1&y=2",
      ),
    ).toBe(
      "https://s.example/api?api=k%201&url=https%3A%2F%2Fthichthihack.com%2Ffree-key%2Fabc%3Fx%3D1%26y%3D2",
    );
  });
});

describe("the service's answer", () => {
  it("reads a bare URL, and JSON under the usual names, a level or two down", () => {
    expect(readShortlinkResponse("https://s.example/x1\n")).toBe(
      "https://s.example/x1",
    );
    expect(
      readShortlinkResponse(
        '{"status":"success","shortenedUrl":"https://s.example/x2"}',
      ),
    ).toBe("https://s.example/x2");
    expect(
      readShortlinkResponse(
        '{"status":"ok","data":{"short_url":"https://s.example/x3"}}',
      ),
    ).toBe("https://s.example/x3");
    expect(readShortlinkResponse('{"url":"https://s.example/x4"}')).toBe(
      "https://s.example/x4",
    );
  });

  it("reads nothing out of an error or junk", () => {
    expect(
      readShortlinkResponse('{"status":"error","message":"Invalid API key"}'),
    ).toBeNull();
    expect(readShortlinkResponse("<html>Running.</html>")).toBeNull();
    expect(readShortlinkResponse("")).toBeNull();
    expect(readShortlinkResponse('{"url":"javascript:alert(1)"}')).toBeNull();
  });
});
