#!/usr/bin/env node

import axios, {AxiosRequestConfig} from 'axios';
import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph } from 'docx'; 
// Import pdfjs-dist dynamically where needed
// import * as pdfjsLib from 'pdfjs-dist'; // Removed static import

// --- Global State ---
let targetFolder: string | null = null;

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
        name: "set_target_folder",
        description: "Set the working folder for Word/file operations. it is mandatory to use this tool before any other tool.",
        inputSchema: {
            type: "object",
            properties: {
                folder: { type: "string", description: "Absolute or relative path to the folder." }
            },
            required: ["folder"]
        },
        outputSchema: {
            type: "object",
            properties: {
                folder: { type: "string" }
            }
        }
    },
    {
        name: "get_target_folder",
        description: "Get the current working folder.",
        inputSchema: { type: "object", properties: {} },
        outputSchema: {
            type: "object",
            properties: {
                folder: { type: "string" }
            }
        }
    },
    {
        name: "get_current_working_directory",
        description: "Get the process current working directory.",
        inputSchema: { type: "object", properties: {} },
        outputSchema: {
            type: "object",
            properties: {
                cwd: { type: "string" }
            }
        }
    },
    {
        name: "list_files_in_target",
        description: "List files in the current target folder.",
        inputSchema: { type: "object", properties: {} },
        outputSchema: {
            type: "object",
            properties: {
                files: { type: "array", items: { type: "string" } }
            }
        }
    },
    {
        name: "read_word_content",
        description: "Reads the text content of a Word (.docx) file (relative to target folder) using mammoth.",
        inputSchema: {
            type: "object",
            properties: {
                fileName: { type: "string", description: "Word file name (relative to target folder)" }
            },
            required: ["fileName"]
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
        description: "Replace words in a Word (.docx) file and save as a new file.",
        inputSchema: {
            type: "object",
            properties: {
                fileName: { type: "string", description: "Word file name (relative to target folder)" },
                replacements: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from", "to"] } },
                outputFileName: { type: "string", description: "Name for the new Word file." }
            },
            required: ["fileName", "replacements", "outputFileName"]
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
        description: "Delete a Word (.docx) file in the target folder.",
        inputSchema: {
            type: "object",
            properties: {
                fileName: { type: "string", description: "Word file name (relative to target folder)" }
            },
            required: ["fileName"]
        },
        outputSchema: {
            type: "object",
            properties: {
                deleted: { type: "boolean" }
            }
        }
    },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const ensureTargetFolder = (): string => {
        if (!targetFolder) {
            throw new Error("Target folder not set. Use 'set_target_folder' first.");
        }
        return targetFolder;
    };
    const toolName = request.params.name;
    const args = request.params.arguments || {};

    switch (toolName) {
        case "set_target_folder": {
            const folder: string = args.folder as string;
            if (!folder) throw new Error("folder is required");
            targetFolder = path.resolve(folder);
            return { content: [{ type: "text", text: JSON.stringify({ folder: targetFolder || null }) }] };
        }
        case "get_target_folder": {
            return { content: [{ type: "text", text: JSON.stringify({ folder: targetFolder || null }) }] };
        }
        case "get_current_working_directory": {
            return { content: [{ type: "text", text: JSON.stringify({ cwd: process.cwd() }) }] };
        }
        case "list_files_in_target": {
            const folder = ensureTargetFolder();
            const files = await fs.readdir(folder);
            return { content: [{ type: "text", text: JSON.stringify({ files: Array.isArray(files) ? files : [] }) }] };
        }
        case "read_word_content": {
            const folder = ensureTargetFolder();
            const fileName: string = args.fileName as string;
            if (!fileName) throw new Error("fileName is required.");
            const filePath = path.join(folder, fileName);
            try {
                const buffer = await fs.readFile(filePath);
                const result = await mammoth.extractRawText({ buffer });
                const rawText = result.value;
                const textElements: TextElement[] = rawText.split(/\s+/).map((word, idx) => ({ id: `word_${idx+1}`, text: word }));
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            textElements,
                            rawText,
                            metadata: {} // No metadata for now
                        }, null, 2)
                    }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ error: `Failed to read or parse Word file at ${filePath}: ${error.message}. Si le problème persiste, essayez de re-sélectionner le dossier cible avec 'set_target_folder'.` }, null, 2) }]
                };
            }
        }
        case "replace_word_words": {
            const folder = ensureTargetFolder();
            const fileName: string = args.fileName as string;
            const outputFileName: string = args.outputFileName as string;
            const replacements: { from: string, to: string }[] = args.replacements as { from: string, to: string }[];
            if (!fileName || !outputFileName || !Array.isArray(replacements)) {
                throw new Error("fileName, outputFileName et replacements sont requis");
            }
            const inputPath = path.join(folder, fileName);
            const outputPath = path.join(folder, outputFileName);
            try {
                // @ts-ignore: No types for docxyz
                const docxyz = await import("docxyz");
                const buffer = await fs.readFile(inputPath);
                const document = new docxyz.Document(buffer);
                // Parcours tous les paragraphes et runs pour remplacer les balises
                document.paragraphs.forEach((paragraph: any) => {
                    paragraph.runs.forEach((run: any) => {
                        let text = run.text;
                        for (const { from, to } of replacements) {
                            if (typeof text === 'string' && text.includes(from)) {
                                text = text.split(from).join(to);
                            }
                        }
                        run.text = text;
                    });
                });
                // Parcours aussi les tableaux (si besoin)
                if (document.tables) {
                    document.tables.forEach((table: any) => {
                        table.rows.forEach((row: any) => {
                            row.cells.forEach((cell: any) => {
                                cell.paragraphs.forEach((paragraph: any) => {
                                    paragraph.runs.forEach((run: any) => {
                                        let text = run.text;
                                        for (const { from, to } of replacements) {
                                            if (typeof text === 'string' && text.includes(from)) {
                                                text = text.split(from).join(to);
                                            }
                                        }
                                        run.text = text;
                                    });
                                });
                            });
                        });
                    });
                }
                await document.save(outputPath);
                return { content: [{ type: "text", text: JSON.stringify({ outputFile: outputFileName }) }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: JSON.stringify({ error: (err?.message || 'Word replace failed') + '. Si le problème persiste, essayez de re-sélectionner le dossier cible avec set_target_folder.' }) }] };
            }
        }
        case "delete_word_file": {
            const folder = ensureTargetFolder();
            const fileName: string = args.fileName as string;
            if (!fileName) throw new Error("fileName is required");
            const filePath = path.join(folder, fileName);
            try {
                await fs.unlink(filePath);
                return { content: [{ type: "text", text: JSON.stringify({ deleted: true }) }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: JSON.stringify({ deleted: false, error: (err?.message || 'Unknown error') + '. Si le problème persiste, essayez de re-sélectionner le dossier cible avec set_target_folder.' }) }] };
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

