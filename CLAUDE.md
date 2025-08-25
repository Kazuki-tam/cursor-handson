# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based OCR (Optical Character Recognition) application for receipts, using OpenAI's Vision API (gpt-5-nano-2025-08-07 model). The application runs entirely in the browser with no backend server required.

## Key Features

- Receipt image text extraction using OpenAI Vision API
- Multi-language support (Japanese, English, Korean) with automatic translation
- Image preview with automatic resizing (max 2000px)
- Text output with copy-to-clipboard and save-as-text functionality
- Drag & drop or file selection for image input
- Progress tracking during OCR processing

## Development Commands

### Local Development Server
Use VS Code Live Server extension (recommended and pre-configured):
- Install the Live Server extension (ritwickdey.LiveServer)
- Right-click on `index.html` and select "Open with Live Server"
- Default port: 5500

Alternative: Use any static HTTP server:
```bash
# Python 3
python3 -m http.server 8000

# Node.js (if http-server is installed)
npx http-server
```

### Testing
No automated tests are configured. Manual testing should cover:
- Image upload (drag & drop and file selection)
- OCR functionality with valid OpenAI API key
- Language selection and translation
- Copy and save functionality

## Architecture

### Tech Stack
- **Frontend Only**: Pure HTML/CSS/JavaScript (ES6+)
- **Styling**: Tailwind CSS via CDN
- **External API**: OpenAI Vision API
- **No Build Process**: Direct browser execution

### File Structure
```
/
├── index.html          # Main HTML with Tailwind CSS
├── app.js             # Core JavaScript logic
├── assets/            # Sample images
└── _llm-docs/         # Documentation
    └── requirements.md # Detailed specifications
```

### Core Components

1. **Image Processing** (app.js:86-136)
   - Handles file selection and drag & drop
   - Automatic image resizing to max 2000px
   - Canvas-based preview rendering

2. **OCR Processing** (app.js:138-241)
   - OpenAI API integration with gpt-5-nano-2025-08-07 model
   - Structured JSON response format
   - Multi-language prompts and translation

3. **UI State Management** (app.js:36-61)
   - Progress tracking and status updates
   - Button state management during processing
   - Toast notifications for user feedback

## API Integration

### OpenAI Vision API
- Model: `gpt-5-nano-2025-08-07`
- Endpoint: `https://api.openai.com/v1/chat/completions`
- API Key: User-provided, stored in browser memory/localStorage
- Request format: Base64 encoded image with structured JSON response

## Security Considerations

- API keys are stored only in browser (localStorage)
- All API communication over HTTPS
- No server-side storage or processing
- Images are sent to OpenAI servers for processing

## Important Implementation Notes

1. **Image Encoding**: Images are converted to base64 data URLs before sending to OpenAI API
2. **Error Handling**: Comprehensive error handling for API failures, network issues, and invalid inputs
3. **Cancellation**: OCR requests can be cancelled using AbortController
4. **Response Parsing**: API responses use structured JSON schema for consistent output format
5. **Language Support**: Automatic translation is handled by the OpenAI model based on the selected language