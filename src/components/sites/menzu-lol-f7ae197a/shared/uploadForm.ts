/**
 * POST a form the way fetch would, but with the upload's progress.
 *
 * fetch has no upload progress; XMLHttpRequest does. On 4G a 5MB screenshot
 * takes seconds to tens of seconds, and for all of that time a spinner
 * cannot say whether it is at 10% or 90% - which is where people close the
 * tab. Used only for the sends that carry a file; everything else keeps
 * fetch.
 *
 * `onProgress` is called with 0..1 as bytes leave. It reaches 1 before the
 * server has answered - it is still decoding and writing the picture - so
 * the caller must say so ("Đang xử lý ảnh…") rather than leave a full bar
 * standing, or the bar becomes the broken promise it exists to replace.
 *
 * Resolves the way a fetch Response would be read: `ok`, `status`, and the
 * JSON body if there is one. Rejects only when the request never reached a
 * server, so a caller's catch means the same thing it meant with fetch.
 */
export function postFormWithProgress(
  url: string,
  form: FormData,
  onProgress: (fraction: number) => void,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(1, event.loaded / event.total));
      }
    };
    xhr.upload.onload = () => onProgress(1);
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: xhr.response ?? null,
      });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new Error("aborted"));
    xhr.send(form);
  });
}
