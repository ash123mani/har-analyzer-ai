// Copy this file to env.js and fill in your API key.
// env.js is .gitignored and will not be committed.
// This file is read by server.js (LLM proxy) on startup.

// OpenAI (default):
// LLM_API_KEY  = 'sk-your-openai-key';
// LLM_BASE_URL = 'https://api.openai.com/v1';
// LLM_MODEL    = 'gpt-4o';

// NVIDIA (OpenAI-compatible, recommended for free tier):
// LLM_API_KEY  = 'nvapi--your-nvidia-key';
// LLM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
// LLM_MODEL    = 'minimaxai/minimax-m2.7';

// Must be uncommented and set at minimum:
LLM_API_KEY  = 'replace-me-with-your-api-key';
