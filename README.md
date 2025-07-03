# Node LLM Server

A Node.js Express server that acts as a proxy for the Anthropic Claude API initially. The server provides a RESTful API endpoint that processes prompts and returns structured, mobile-friendly responses.

## Features

- **Claude API Integration**: Proxy for Anthropic's Claude 3 Sonnet model
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Error Handling**: Comprehensive error handling with specific error codes
- **CORS Support**: Cross-origin resource sharing enabled
- **Health Check**: Built-in health monitoring endpoint
- **Environment Configuration**: Secure API key management

## Prerequisites

- Node.js (version 16 or higher recommended)
- npm or yarn package manager
- Anthropic API key

## Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd elektron-voice-recorder-llm-server
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Copy `.env.example` and rename it to `.env` in the root directory:

   ```bash
   touch .env
   ```

   Add your Anthropic API key:

   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   PORT=3001
   ```

   > **Note**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

4. **Get an Anthropic API Key**:
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Create an account and generate an API key
   - Add the key to your `.env` file

## Running the Server

### Development Mode

```bash
npm run dev
```

This starts the server with nodemon for automatic restarts during development.

### Production Mode

```bash
npm start
```

This starts the server in production mode.

### Manual Start

```bash
node server.js
```

The server will start on port 3001 by default (or the port specified in your `.env` file).

## API Endpoints

### Health Check

- **URL**: `GET /health`
- **Description**: Check if the server is running
- **Response**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### LLM Query

- **URL**: `POST /api/query`
- **Description**: Send a prompt to Claude and get a structured response
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "prompt": "Your question or prompt here",
    "temperature": 0.3,
    "max_tokens": 800,
    "top_p": 0.9
  }
  ```

#### Request Parameters

- `prompt` (required): The text prompt to send to Claude
- `temperature` (optional): Controls randomness (0.0-1.0, default: 0.3)
- `max_tokens` (optional): Maximum tokens in response (default: 800)
- `top_p` (optional): Nucleus sampling parameter (default: 0.9)

## Error Handling

The API returns structured error responses with specific error codes:

### Error Response Format

```json
{
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `INVALID_PROMPT`: Missing or invalid prompt
- `PROMPT_TOO_LONG`: Prompt exceeds 10,000 character limit
- `RATE_LIMIT_EXCEEDED`: Too many requests (429)
- `AUTHENTICATION_ERROR`: Invalid API key (401)
- `TIMEOUT`: Request timeout (504)
- `INTERNAL_ERROR`: Server error (500)
- `NOT_FOUND`: Endpoint not found (404)

## Rate Limiting

The API implements rate limiting:

- **Limit**: 100 requests per minute per IP address
- **Window**: 1 minute
- **Response**: 429 status code with retry information

## Usage Examples

### Using curl

```bash
# Health check
curl http://localhost:3001/health

# Send a query
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "temperature": 0.3
  }'
```

### Using JavaScript (fetch)

```javascript
const response = await fetch("http://localhost:3001/api/query", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    prompt: "Explain quantum computing in simple terms",
    temperature: 0.3,
  }),
});

const data = await response.json();
console.log(data.data.summary_points);
```

### Using Python (requests)

```python
import requests

response = requests.post('http://localhost:3001/api/query',
  json={
    'prompt': 'Explain quantum computing in simple terms',
    'temperature': 0.3
  }
)

data = response.json()
print(data['data']['summary_points'])
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `PORT`: Server port (default: 3001)

### Server Configuration

- **Request Size Limit**: 10MB
- **Timeout**: 30 seconds for Claude API calls
- **CORS**: Enabled for all origins
- **Rate Limiting**: 100 requests/minute per IP

## Development

### Project Structure

```
elektron-voice-recorder-llm-server/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── package-lock.json  # Locked dependency versions
├── .env.example              # Environment variables (create this)
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

### Available Scripts

- `npm start`: Start the server in production mode
- `npm run dev`: Start the server with nodemon for development
- `npm test`: Run tests (currently not implemented)

### Dependencies

- **express**: Web framework
- **axios**: HTTP client for API calls
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting middleware
- **dotenv**: Environment variable management
- **nodemon**: Development server with auto-restart

## Security Considerations

1. **API Key Protection**: Never expose your Anthropic API key in client-side code
2. **Rate Limiting**: The server includes rate limiting to prevent abuse
3. **Input Validation**: All inputs are validated before processing
4. **Error Handling**: Sensitive information is not exposed in error messages

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**:

   - Check that your `ANTHROPIC_API_KEY` is correctly set in `.env`
   - Verify your API key is valid in the Anthropic console

2. **"Rate limit exceeded" error**:

   - Wait for the rate limit window to reset (1 minute)
   - Consider implementing client-side rate limiting

3. **Server won't start**:

   - Check that port 3001 (or your configured port) is available
   - Verify all dependencies are installed with `npm install`

4. **CORS errors**:
   - The server has CORS enabled for all origins
   - If you're still getting CORS errors, check your client configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see the LICENSE file for details.

## Author

elh.mx

## Support

For issues and questions, please create an issue in the repository or contact the maintainer.
