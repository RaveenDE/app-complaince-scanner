"use strict";

exports.handler = async (event) => {
  const method = event.httpMethod ?? "GET";
  const path = event.path ?? "/";
  if (method === "POST" && path === "/scans") {
    return {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "synth-placeholder" }),
    };
  }
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "queued" }),
  };
};
