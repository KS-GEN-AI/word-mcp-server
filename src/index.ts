#!/usr/bin/env node

import axios, {AxiosRequestConfig} from 'axios';
import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import process from 'process';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph } from 'docx'; 
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// Import pdfjs-dist dynamically where needed
// import * as pdfjsLib from 'pdfjs-dist'; // Removed static import

// --- Global State ---
// let targetFolder: string | null = null;

// --- Interface for PDF text elements ---
interface TextElement {
    id: string;
    text: string;
}

const server = new Server(
    {
        name: "PDF Tools Server (MCP compatible)",
        version: "0.4.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// --- Tool Schemas ---
const tools = [
    {
        name: "list_files_in_folder",
        description: "List files in a given folder (absolute or relative to cwd). If no folderPath is provided, uses cwd.",
        inputSchema: {
            type: "object",
            properties: {
                folderPath: { type: "string", description: "Absolute or relative path to the folder." }
            }
        },
        outputSchema: {
            type: "object",
            properties: {
                files: { type: "array", items: { type: "string" } }
            }
        }
    },
    {
        name: "read_word_content",
        description: "Reads the text content of a Word (.docx) file (absolute or relative path)",
        inputSchema: {
            type: "object",
            properties: {
                filePath: { type: "string", description: "Word file path (absolute or relative to cwd)" }
            },
            required: ["filePath"]
        },
        outputSchema: {
            type: "object",
            properties: {
                textElements: { type: "array", items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } } } },
                rawText: { type: "string" },
                metadata: { type: "object" }
            }
        }
    },
    {
        name: "replace_word_words",
        description: "Replace words in a Word (.docx) file and save as a new file. Accepts absolute or relative paths.",
        inputSchema: {
            type: "object",
            properties: {
                filePath: { type: "string", description: "Word file path (absolute or relative to cwd)" },
                replacements: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from", "to"] } },
                outputFilePath: { type: "string", description: "Path for the new Word file (absolute or relative to cwd)." }
            },
            required: ["filePath", "replacements", "outputFilePath"]
        },
        outputSchema: {
            type: "object",
            properties: {
                outputFile: { type: "string" }
            }
        }
    },
    {
        name: "delete_word_file",
        description: "Delete a Word (.docx) file (absolute or relative path).",
        inputSchema: {
            type: "object",
            properties: {
                filePath: { type: "string", description: "Word file path (absolute or relative to cwd)" }
            },
            required: ["filePath"]
        },
        outputSchema: {
            type: "object",
            properties: {
                deleted: { type: "boolean" }
            }
        }
    },
    {
        name: "word_to_pdf",
        description: "Convert a Word (.docx) file to PDF, preserving all formatting and images. Accepts absolute or relative paths. Requires LibreOffice installed.",
        inputSchema: {
            type: "object",
            properties: {
                filePath: { type: "string", description: "Word file path (absolute or relative to cwd)" },
                outputFilePath: { type: "string", description: "Path for the output PDF file (absolute or relative to cwd)." }
            },
            required: ["filePath", "outputFilePath"]
        },
        outputSchema: {
            type: "object",
            properties: {
                outputFile: { type: "string" }
            }
        }
    },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};

    switch (toolName) {
        case "list_files_in_folder": {
            const folderPathArg = args.folderPath;
            const folder = typeof folderPathArg === 'string' && folderPathArg.length > 0 ? path.resolve(folderPathArg) : process.cwd();
            const files = await fs.readdir(folder);
            return { content: [{ type: "text", text: JSON.stringify({ files: Array.isArray(files) ? files : [] }) }] };
        }
        case "read_word_content": {
            const filePath: string = args.filePath as string;
            if (!filePath) throw new Error("filePath is required.");
            const absPath = path.resolve(filePath);
            try {
                const buffer = await fs.readFile(absPath);
                const result = await mammoth.extractRawText({ buffer });
                const rawText = result.value;
                const textElements: TextElement[] = rawText.split(/\s+/).map((word, idx) => ({ id: `word_${idx+1}`, text: word }));
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            textElements,
                            rawText,
                            metadata: {}
                        }, null, 2)
                    }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ error: `Failed to read or parse Word file at ${absPath}: ${error.message}.` }, null, 2) }]
                };
            }
        }
        case "replace_word_words": {
            const filePath: string = args.filePath as string;
            const outputFilePath: string = args.outputFilePath as string;
            const replacements: { from: string, to: string }[] = args.replacements as { from: string, to: string }[];
            if (!filePath || !outputFilePath || !Array.isArray(replacements)) {
                throw new Error("filePath, outputFilePath et replacements sont requis");
            }
            const inputPath = path.resolve(filePath);
            const outputPath = path.resolve(outputFilePath);
            try {
                const content = await fs.readFile(inputPath);
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: {
                        start: '{{',
                        end: '}}'
                    },
                    nullGetter: (tag) => {
                        console.warn(`Warning: Placeholder '${tag}' not found in provided data.`);
                        return `{{${tag}}}`;
                    }
                });

                const dataForDocxtemplater = replacements.reduce((acc, { from, to }) => {
                  const match = from.match(/^{{(.*)}}$/);
                  if (match && match[1]) {
                    const key = match[1].trim();
                    if (key) {
                        acc[key] = to;
                    } else {
                        console.warn(`Skipping replacement: Empty placeholder found inside '{{}}' originating from '${from}'.`);
                    }
                  } else {
                     console.warn(`Skipping replacement: Invalid placeholder format '${from}'. Expected '{{key}}'.`);
                  }
                  return acc;
                }, {} as Record<string, string>);

                doc.render(dataForDocxtemplater);

                const buf = doc.getZip().generate({
                    type: "nodebuffer",
                    compression: "DEFLATE",
                });

                await fs.writeFile(outputPath, buf);

                return { content: [{ type: "text", text: JSON.stringify({ outputFile: outputFilePath }) }] };

            } catch (error: any) {
                console.error(`Detailed error processing file ${filePath}:`, JSON.stringify(error, null, 2));
                let specificExplanation = "";
                if (error.properties && error.properties.explanation) {
                    specificExplanation = ` Explanation: ${error.properties.explanation}`;
                }
                const errorMessage = error.properties && error.properties.errors ? 
                    `Template Error: ${error.properties.errors.map((e: any) => `${e.id}: ${e.message}`).join(', ')}` :
                    error.message;
                return {
                    content: [{ type: "text", text: JSON.stringify({ error: `Failed to replace words in ${filePath} and save to ${outputFilePath}: ${errorMessage}.${specificExplanation}` }, null, 2) }]
                };
            }
        }
        case "delete_word_file": {
            const filePath: string = args.filePath as string;
            if (!filePath) throw new Error("filePath is required");
            const absPath = path.resolve(filePath);
            try {
                await fs.unlink(absPath);
                return { content: [{ type: "text", text: JSON.stringify({ deleted: true }) }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: JSON.stringify({ deleted: false, error: (err?.message || 'Unknown error') }) }] };
            }
        }
        case "word_to_pdf": {
            const filePath: string = args.filePath as string;
            const outputFilePath: string = args.outputFilePath as string;
            if (!filePath || !outputFilePath) {
                throw new Error("filePath and outputFilePath are required");
            }
            const inputPath = path.resolve(filePath);
            const outputPath = path.resolve(outputFilePath);
            try {
                const { exec, execSync } = await import('child_process');
                let sofficePath = '';
                try {
                    sofficePath = execSync('which soffice').toString().trim();
                } catch (e) {
                    sofficePath = '';
                }
                if (!sofficePath) {
                    const possiblePaths = [
                        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
                        '/opt/homebrew/bin/soffice',
                        '/usr/local/bin/soffice',
                        '/usr/bin/soffice'
                    ];
                    for (const p of possiblePaths) {
                        try {
                            if (fsSync.statSync(p)) {
                                sofficePath = p;
                                break;
                            }
                        } catch {}
                    }
                }
                if (!sofficePath) {
                    throw new Error("Impossible de trouver la commande 'soffice'. Assure-toi que LibreOffice est installé et que 'soffice' est dans le PATH.");
                }
                await new Promise((resolve, reject) => {
                    exec(
                        `"${sofficePath}" --headless --convert-to pdf --outdir "${path.dirname(outputPath)}" "${inputPath}"`,
                        (error, stdout, stderr) => {
                            if (error) {
                                reject(new Error(`LibreOffice conversion failed: ${stderr || error.message}`));
                            } else {
                                resolve(stdout);
                            }
                        }
                    );
                });
                const inputBase = path.basename(inputPath, path.extname(inputPath));
                const generatedPdf = path.join(path.dirname(outputPath), `${inputBase}.pdf`);
                if (generatedPdf !== outputPath) {
                    await fs.rename(generatedPdf, outputPath);
                }
                return { content: [{ type: "text", text: JSON.stringify({ outputFile: outputFilePath }) }] };
            } catch (error: any) {
                return { content: [{ type: "text", text: JSON.stringify({ error: `Failed to convert ${filePath} to PDF: ${error.message}` }) }] };
            }
        }
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});

