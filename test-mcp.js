#!/usr/bin/env node

//
// test-mcp.js
//
// A minimal script that spawns the Integration App MCP server
// using the sub-path CJS modules from @modelcontextprotocol/sdk
// and calls "list_tools" once. This bypasses missing "exports" and subpath issues.
//
// Usage:
//   1) Ensure "dotenv" is installed: npm install dotenv
//   2) Create a .env file with:
//       INTEGRATION_APP_TOKEN=eyJ...
//       INTEGRATION_KEY=hubspot
//   3) node test-mcp.js
//

require("dotenv").config()
const fs = require("fs")
const path = require("path")
const process_ = require("node:process")

async function main() {
  try {
    console.log("=== test-mcp.js starting ===")

    // 1) Paths to sub-path CJS modules:
    //    cjs/client/stdio.js => exports { StdioClientTransport }
    //    cjs/client/index.js => exports { Client }
    const sdkCjsStdio = path.join(
      process_.cwd(),
      "node_modules",
      "@modelcontextprotocol",
      "sdk",
      "dist",
      "cjs",
      "client",
      "stdio.js"
    )
    const sdkCjsClient = path.join(
      process_.cwd(),
      "node_modules",
      "@modelcontextprotocol",
      "sdk",
      "dist",
      "cjs",
      "client",
      "index.js"
    )

    // Confirm these files exist
    if (!fs.existsSync(sdkCjsStdio)) {
      console.error("Could not find cjs/client/stdio.js at:", sdkCjsStdio)
      process_.exit(1)
    }
    if (!fs.existsSync(sdkCjsClient)) {
      console.error("Could not find cjs/client/index.js at:", sdkCjsClient)
      process_.exit(1)
    }

    console.log("sdkCjsStdio =", sdkCjsStdio)
    console.log("sdkCjsClient =", sdkCjsClient)

    // 2) Require them
    const { StdioClientTransport } = require(sdkCjsStdio)
    const { Client } = require(sdkCjsClient)

    // 3) Path to the Integration App MCP server
    const pathToMcpServer = path.join(
      process_.cwd(),
      "node_modules",
      "@integration-app",
      "mcp-server",
      "dist",
      "index.js"
    )
    if (!fs.existsSync(pathToMcpServer)) {
      console.error("Integration App MCP server file not found at:", pathToMcpServer)
      process_.exit(1)
    }

    console.log("pathToMcpServer =", pathToMcpServer)

    // 4) Load .env variables
    const integrationAppToken = process_.env.INTEGRATION_APP_TOKEN
    const integrationKey = process_.env.INTEGRATION_KEY
    if (!integrationAppToken || !integrationKey) {
      console.error("Missing INTEGRATION_APP_TOKEN or INTEGRATION_KEY in environment")
      process_.exit(1)
    }

    console.log("Using token (first 10 chars) =", integrationAppToken.slice(0,10)+"...")
    console.log("Using key =", integrationKey)

    // 5) Create Stdio transport
    const { execPath } = process_
    const transport = new StdioClientTransport({
      command: execPath,
      args: [pathToMcpServer],
      env: {
        INTEGRATION_APP_TOKEN: integrationAppToken,
        INTEGRATION_KEY: integrationKey,
      },
      stderr: "pipe",
      shell: false,
    })

    console.log("Spawning child process...")

    await transport.start()
    console.log("Child process started")

    // If needed, debug exit code
    // @ts-ignore
    const childProc = transport._process
    if (childProc) {
      childProc.on("exit", (code, signal) => {
        console.warn(`Child process exited with code=${code}, signal=${signal}`)
      })
    }

    // 6) Create the MCP Client
    const client = new Client(transport, {
      name: "LocalTestClient",
      version: "1.0.0",
      description: "Integration App MCP local test script (sub-path cjs)",
      capabilities: { tools: {} },
    })

    client.onSend = (msg) => transport.send(msg)
    transport.onmessage = (incoming) => client.handleMessage(incoming)

    if (transport.stderr) {
      transport.stderr.on("data", (chunk) => {
        console.log("=== Child process stderr ===")
        console.log(chunk.toString("utf-8"))
      })
    }

    // 7) Wait a couple seconds so server can init
    console.log("Waiting 2s to let server init")
    await new Promise((r) => setTimeout(r, 2000))

    // 8) Attempt "list_tools"
    console.log("Calling list_tools now...")
    const listResp = await client.request({ name: "list_tools", data: {} })
    console.log("list_tools response:", listResp)
    if (listResp?.tools) {
      console.log("Tools found:", listResp.tools.map(t => t.name))
    } else {
      console.log("No tools array returned:", listResp)
    }

    console.log("=== Done. If you see 'Not connected' or a silent exit, token or integration is invalid. ===")
    process_.exit(0)
  } catch (err) {
    console.error("test-mcp.js error:", err)
    process_.exit(1)
  }
}

main()
