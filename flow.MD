# Flow: Text to Mind Map with NestJS and DeepSeek API

## Goal

Build a backend feature in NestJS that receives educational text from the frontend and converts it into a structured mind map using DeepSeek API.

The backend only returns structured JSON.

The frontend will be responsible for rendering the mind map visually.

---

# Main Flow

```text
User
  ↓
Frontend Input
  ↓
NestJS API
  ↓
Input Validation
  ↓
Mind Map Prompt Builder
  ↓
DeepSeek API
  ↓
AI JSON Response
  ↓
Response Validation
  ↓
Return Mind Map Data
  ↓
Frontend Render
```

---

# Detailed Flow

## 1. User Input

The user enters or uploads learning content.

Examples:

* Historical article
* Lesson content
* Heritage site description
* Event description
* PDF extracted text

The input is plain text.

---

## 2. Frontend Sends Request

Frontend sends the text to NestJS backend.

Request should contain:

* text content
* language
* optional learning level
* optional topic type

Example fields:

```text
text
language
level
topicType
```

The frontend must not call DeepSeek directly.

The DeepSeek API key must stay inside the backend.

---

## 3. NestJS Receives Request

NestJS receives the request through an AI endpoint.

Example endpoint:

```text
POST /ai/mind-map
```

The controller is responsible for:

* receiving request
* validating input shape
* rejecting empty text
* rejecting text that is too long
* passing clean data to service

---

## 4. Input Validation

Before calling DeepSeek, backend must validate:

* text is not empty
* text is string
* text length is within limit
* language is supported
* request is safe to process

If input is invalid, return an error immediately.

Do not call DeepSeek for invalid input.

---

## 5. Prompt Building

Backend creates a prompt for DeepSeek.

The prompt must clearly tell AI to:

* convert text into mind map
* return JSON only
* use Vietnamese
* keep labels short
* group related ideas
* avoid hallucination
* limit mind map depth
* preserve factual accuracy

The AI must generate structure, not UI.

---

## 6. DeepSeek API Call

Backend calls DeepSeek API using the server-side API key.

DeepSeek receives:

* system instruction
* user content
* output format instruction

Expected AI behavior:

* read the input text
* identify main topic
* extract key concepts
* group concepts into branches
* return structured JSON tree

---

## 7. AI Output Format

DeepSeek should return a JSON object with:

```text
title
mindMap
```

The mind map should follow a tree structure:

```text
Root Topic
  ├── Main Branch
  │     ├── Sub Branch
  │     └── Detail
  ├── Main Branch
  └── Main Branch
```

Each node should contain:

```text
id
label
description
children
```

---

# Mind Map Structure Rules

## Root Node

The root node represents the main topic.

Example:

```text
Địa đạo Củ Chi
```

---

## Main Branches

Main branches represent major aspects of the topic.

For a historical topic, branches may include:

```text
Bối cảnh
Nguyên nhân
Diễn biến
Nhân vật
Kết quả
Ý nghĩa
Bài học
```

For a heritage site, branches may include:

```text
Vị trí
Lịch sử
Kiến trúc
Giá trị văn hóa
Sự kiện liên quan
Trải nghiệm tham quan
```

---

## Child Nodes

Child nodes explain or break down a main branch.

They should be short and easy to understand.

---

## Maximum Depth

The mind map should not be too deep.

Recommended depth:

```text
Level 1: Root
Level 2: Main branches
Level 3: Sub topics
Level 4: Details
```

Do not exceed 4 levels.

---

## Label Rules

Labels should be:

* short
* meaningful
* easy to scan
* suitable for visual display

Good labels:

```text
Nguyên nhân
Diễn biến chính
Kết quả
Ý nghĩa lịch sử
```

Bad labels:

```text
Những nguyên nhân phức tạp dẫn đến sự kiện này trong nhiều giai đoạn khác nhau
```

---

# Backend Validation After AI Response

After receiving the AI response, NestJS must validate it.

Check:

* response is valid JSON
* title exists
* mindMap exists
* root node exists
* each node has id
* each node has label
* children is an array
* depth does not exceed 4
* duplicate ids are not allowed
* label is not too long

If AI output is invalid:

* retry once with stricter prompt
* if still invalid, return controlled error

Do not send broken AI response to frontend.

---

# Response to Frontend

Backend returns clean mind map data.

The frontend should receive only the final validated structure.

Example response shape:

```text
{
  title,
  mindMap
}
```

Do not return:

* raw DeepSeek response
* API metadata
* tokens
* system prompt
* API key
* internal errors

---

# Frontend Rendering Flow

Frontend receives the validated tree.

Then frontend:

```text
Tree JSON
  ↓
Convert to React Flow nodes
  ↓
Convert parent-child relations to edges
  ↓
Render visual mind map
```

Frontend responsibilities:

* display root topic
* display branches
* connect nodes with edges
* support zoom and pan
* support expand and collapse
* show description on click or hover

---

# Error Flow

## Invalid User Input

```text
User submits empty or invalid text
  ↓
NestJS validates input
  ↓
Return validation error
```

---

## DeepSeek API Error

```text
DeepSeek unavailable
  ↓
NestJS catches error
  ↓
Return friendly error message
```

---

## Invalid AI JSON

```text
DeepSeek returns invalid JSON
  ↓
Backend retries once
  ↓
Validate again
  ↓
If still invalid, return error
```

---

# Caching Flow

To reduce cost, cache generated mind maps.

```text
Input text
  ↓
Create hash from text
  ↓
Check cache
  ↓
If exists, return cached mind map
  ↓
If not exists, call DeepSeek
  ↓
Save result to cache
```

Recommended cache storage:

```text
Redis
Database
```

---

# Database Flow

If the app needs history, save generated mind maps.

Store:

```text
userId
sourceText
title
mindMap
createdAt
updatedAt
```

This allows users to:

* reopen old mind maps
* edit generated mind maps
* regenerate content
* export later

---

# Security Rules

* Never expose DeepSeek API key to frontend.
* Keep API key in backend environment variables.
* Validate all user inputs.
* Limit text size.
* Add rate limiting.
* Add authentication if users save mind maps.
* Do not store sensitive text without user permission.
* Do not return internal API errors directly.

---

# Recommended NestJS Modules

Use one dedicated module:

```text
AI Module
```

Inside it:

```text
Controller
Service
Prompt Builder
Response Validator
Cache Layer
Repository
```

Responsibilities:

## Controller

Handles HTTP request and response.

## Service

Handles main business logic.

## Prompt Builder

Creates DeepSeek prompts.

## Response Validator

Checks AI output.

## Cache Layer

Avoids duplicate AI calls.

## Repository

Stores generated mind maps if needed.

---

# Success Criteria

The feature is successful when:

1. User submits educational text.
2. Backend sends it to DeepSeek safely.
3. DeepSeek returns structured mind map JSON.
4. Backend validates the response.
5. Frontend renders the mind map correctly.
6. No API key is exposed.
7. Invalid AI responses are handled safely.
8. Same input can be cached to reduce cost.
