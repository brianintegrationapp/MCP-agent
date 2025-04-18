import { NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"
import path from "path"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { Request, Result, ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js"

interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

let mcpClient: Client<Request, Request, Result> | null = null
let toolsCache: Tool[] = []
let openai: OpenAI | null = null

export async function POST(req: NextRequest) {
  try {
    const { userMessage, history } = await req.json()

    // Initialize OpenAI if not already done
    if (!openai) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY in environment variables")
      }
      openai = new OpenAI({ apiKey })
    }

    // Initialize MCP client if not already done
    if (!mcpClient) {
      console.log("MCP: Creating child process with Node + MCP server JS...")

      // 1) Path to the server code
      const pathToMcpServer = path.join(
        process.cwd(),
        "node_modules",
        "@integration-app",
        "mcp-server",
        "dist",
        "index.js"
      )
      console.log("MCP: pathToMcpServer =", pathToMcpServer)

      // 2) Read env from .env
      const integrationAppToken = process.env.INTEGRATION_APP_TOKEN
      const integrationKey = process.env.INTEGRATION_KEY
      if (!integrationAppToken || !integrationKey) {
        throw new Error("Missing INTEGRATION_APP_TOKEN or INTEGRATION_KEY in .env")
      }
      console.log("MCP: Using .env token (first 10 chars) =", integrationAppToken.slice(0, 10) + "...")
      console.log("MCP: Using .env key =", integrationKey)

      // 3) Create the transport
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [pathToMcpServer],
        env: {
          INTEGRATION_APP_TOKEN: integrationAppToken,
          INTEGRATION_KEY: integrationKey,
        },
        stderr: "pipe",
      })

      // 4) Create the MCP client with (transport, metadata)
      const client = new Client<Request, Request, Result>({
        name: "MyNextJsClient",
        version: "1.0.0",
        description: "Integration App MCP in Next.js",
        capabilities: { tools: {} },
      })

      // 5) Connect the client to the transport - this will start the transport
      console.log("MCP: Connecting client to transport...")
      await client.connect(transport)
      console.log("MCP: Client connected successfully")

      // 6) optional: log child stderr
      if (transport.stderr) {
        transport.stderr.on("data", (chunk: Buffer) => {
          console.log("=== Child process stderr ===")
          console.log(chunk.toString("utf-8"))
        })
      }

      mcpClient = client

      // 7) Wait for connection to be established and get tools
      console.log("MCP: waiting for connection to be established...")
      try {
        // Use the listTools method directly
        const listResp = await mcpClient.listTools({})
        
        if (listResp && 'tools' in listResp) {
          toolsCache = listResp.tools as Tool[]
          console.log("MCP: Tools found =>", toolsCache.map((t) => t.name))
        } else {
          console.error("MCP: Unexpected response format from listTools")
        }
      } catch (error) {
        console.error("MCP: Error listing tools:", error)
        throw error
      }
    }

    // Check if we have tools available
    if (!toolsCache.length) {
      throw new Error('No tools available from MCP server')
    }

    // Log available tools and their schemas
    console.log("MCP: Available tools:", toolsCache.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    })))

    // Use OpenAI to determine if we should use a tool and which one
    const toolDescriptions = toolsCache.map(tool => 
      `Tool: ${tool.name}\nDescription: ${tool.description}\nInput Schema: ${JSON.stringify(tool.inputSchema)}`
    ).join('\n\n')

    // Create a system message that explains the available tools
    const systemMessage = `You are a helpful AI assistant that can use tools to help users.
Available tools:
${toolDescriptions}

When a user asks to create a contact or add someone to contacts, use the appropriate tool.
Otherwise, just have a normal conversation.
Do not mention the tools unless the user specifically asks about them.
If you need to use a tool, respond with a JSON object in this format:
{
  "useTool": true,
  "toolName": "name-of-tool",
  "toolArguments": { "param1": "value1", "param2": "value2" }
}

If you don't need to use a tool, just respond normally.`

    // Format the conversation history for OpenAI
    const formattedHistory = history.map((msg: Message) => ({
      role: msg.role,
      content: msg.content
    }))

    // Call OpenAI to get a response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        ...formattedHistory,
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const aiResponse = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response."

    // Check if the AI wants to use a tool
    let toolToUse = null
    let toolArguments = null

    try {
      // Look for JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*"useTool"[\s\S]*\}/)
      if (jsonMatch) {
        const toolData = JSON.parse(jsonMatch[0])
        if (toolData.useTool) {
          toolToUse = toolData.toolName
          toolArguments = toolData.toolArguments
        }
      }
    } catch (e) {
      console.log("No tool usage detected in AI response")
    }

    // If the AI wants to use a tool, call it
    if (toolToUse) {
      console.log(`MCP: AI wants to use tool: ${toolToUse} with arguments:`, toolArguments)
      
      // Find the tool in our cache
      const tool = toolsCache.find(t => t.name === toolToUse)
      if (!tool) {
        throw new Error(`Tool '${toolToUse}' not found`)
      }

      // Call the tool
      const toolResp = await mcpClient.callTool({
        name: toolToUse,
        arguments: toolArguments
      })

      console.log("MCP: Tool response:", JSON.stringify(toolResp, null, 2))

      if (!toolResp) {
        throw new Error('Empty response from tool')
      }

      // Format the response for the frontend
      let formattedResponse
      
      if ('content' in toolResp && Array.isArray(toolResp.content)) {
        const textContent = toolResp.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join(' ')
          
        let parsedContent
        try {
          if (textContent.startsWith('{') && textContent.endsWith('}')) {
            parsedContent = JSON.parse(textContent)
          }
        } catch (e) {
          console.log("MCP: Could not parse content as JSON:", e)
        }
        
        // Create a response that includes both the AI's message and the tool result
        formattedResponse = {
          newMessages: [
            {
              role: 'assistant',
              content: aiResponse
            },
            {
              role: 'assistant',
              content: parsedContent 
                ? `Contact created successfully with ID: ${parsedContent.id}`
                : textContent
            }
          ]
        }
      } else {
        formattedResponse = {
          newMessages: [
            {
              role: 'assistant',
              content: aiResponse
            },
            {
              role: 'assistant',
              content: 'Operation completed successfully.'
            }
          ]
        }
      }
      
      return NextResponse.json(formattedResponse)
    } else {
      // If no tool was used, just return the AI's response
      return NextResponse.json({
        newMessages: [
          {
            role: 'assistant',
            content: aiResponse
          }
        ]
      })
    }
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
