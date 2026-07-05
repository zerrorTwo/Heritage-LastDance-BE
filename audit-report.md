# NestJS Service Audit Report

Date: 2026-07-03

## Inventory

| Service | Module | Public Methods | Dependencies | Priority |
|---|---|---|---|---|
| AuthService | auth | signIn, signUp, verifyOTP, resendOtp, forgotPassword, verifyForgotPasswordOtp, resetPassword, googleLogin, changePassword, refreshToken, logout, cleanUpExpiredChallenges | UserRepository, AuthRepository, SessionRepository, JwtService, AuditLogRepository, MailService | critical |
| UserService | user | getUserById, getUserEntityById, getAllUsers, updateUser, updateUserByAdmin, deleteUser, toClientUser | UserRepository | critical |
| MailService | pkg/mail | sendEmail, sendOtpEmail, sendForgotPasswordEmail | Resend, file templates | critical |
| HeritageService | heritage | getHeritageBySlug, getHeritageById, getAllHeritage, createHeritage, updateHeritage, deleteHeritage, backfillAiSync | HeritageRepository, CACHE_MANAGER, RagService | standard |
| HeritageCategoryService | heritage_category | getCategoryBySlug, getCategoryById, getAllCategories, createCategory, updateCategory, deleteCategory | HeritageCategoryRepository | standard |
| HeritageLocationService | heritage_location | getLocationById, getLocationsByHeritageId, createLocation, updateLocation, deleteLocation | HeritageLocationRepository | standard |
| HeritageMediaService | heritage_media | getMediaById, getMediaByHeritageId, createMedia, updateMedia, deleteMedia | HeritageMediaRepository | standard |
| HeritageRelationService | heritage_relation | getRelationById, getRelationsByFromId, getRelationsByToId, createRelation, updateRelation, deleteRelation | HeritageRelationRepository | standard |
| HeritageTimelineService | heritage_timeline | getTimelineById, getTimelinesByHeritageId, createTimeline, updateTimeline, deleteTimeline | HeritageTimelineRepository | standard |
| HeritageTranslationService | heritage_translation | getTranslationById, getTranslationsByHeritageId, createTranslation, updateTranslation, deleteTranslation | HeritageTranslationRepository | standard |
| BannerService | banner | findAll, findById, findByType, create, update, delete | BannerRepository | standard |
| CommentService | comment | getAll, getCommentById, createNew, updateComment, deleteComment, likeComment | CommentRepository, UserService | standard |
| DiscussService | discuss | getAll, getById, create, update, delete | DiscussRepository | standard |
| FavoriteService | favorite | getAll, getFavoriteById, createNew, updateFavorite, deleteFavorite, getFavoritesByUser, checkFavoriteStatus, toggleFavorite | FavoriteRepository | standard |
| FriendService | friend | sendRequest, acceptRequest, rejectRequest, removeFriend, getFriends, getPendingRequests, searchUsers, areFriends | FriendRepository, UserRepository | standard |
| ChatRoomService | chat-room | getRoomById, createChatRoom, ensureHeritageRoom, joinRoom, leaveRoom, saveMessage, getRoomMessages, getRoomUsers, findOrCreateDirectRoom, getDirectRooms | ChatRoomRepository, ChatRoomParticipantRepository, MessageRepository, FriendService | standard |
| GamificationService | gamification | awardXp, checkIn, moderate, getProgress, getPassport, getCommunity, getVisited | TypeORM repositories | standard |
| GraphService | graph | getMapLocations, getNeighbors, getFullGraph, getOverviewStats, getTimeline, source | GraphRepository | standard |
| GraphAdminService | graph | upsertNode, deleteNode, upsertEdge, deleteEdge, syncNeo4j, importSeed | GraphRepository, Neo4jService | standard |
| Neo4jService | graph | onModuleInit, onModuleDestroy, run | neo4j-driver | standard |
| PersonaService | graph | listPersonas, getPersona, hasLLM, streamAnswer | GraphRepository, fetch/LLM | standard |
| KnowledgeTestService | knowledge-test | createTest, getTests, getTestById, updateTest, deleteTest, getTestsByHeritage, updateBasicInfo, submitAttempt, getLeaderboard, getQuestions, getQuestionById, addQuestion, updateQuestion, deleteQuestion, getOptions, addOption, updateOption, deleteOption | KnowledgeTestRepository, QuestionRepository, OptionRepository, AttemptRepository, LeaderboardRepository | standard |
| LeaderboardService | leaderboard | getLeaderboard, getUserRank, submitScore, getGlobalLeaderboard | LeaderboardRepository, UserRepository | standard |
| McpTokenService | mcp-token | create, verify, revoke, findByUserId | McpTokenRepository | critical |
| MetricsService | metrics | recordHttpRequest, getContentType, getMetrics | prom-client Registry, Counter, Histogram | standard |
| MindMapService | mind-map | generate | PromptBuilder, ResponseValidator, DeepSeek HTTP API | standard |
| RagService | rag | syncHeritage, removeHeritage, importKnowledge, getProgress, search, listWiki, getWikiPage, query | AI service HTTP API | standard |
| TripService | trip | create, findAll, findOne, update, remove, checkIn, complete, nearby | TripRepository, HeritageRepository, HeritageLocationRepository, GamificationService | standard |

## Architecture

| Priority | File | Line | Rule | Finding | Suggested Fix |
|---|---|---:|---|---|---|
| Medium | `src/modules/knowledge-test/service.ts` | broad | ARCH-6 | Service is large and mixes test/question/option/attempt/leaderboard concerns. | Split into `KnowledgeTestService`, `QuestionService`, `AttemptService`, `LeaderboardWriteService` incrementally. |
| Medium | `src/modules/trip/service.ts` | broad | ARCH-6 | Service is large with hydration, geo detection, CRUD, check-in flow. | Extract hydration/geo helper provider first, then trip lifecycle service. |
| Medium | `src/modules/gamification/service.ts` | broad | ARCH-6 | Service has long methods and multiple responsibilities. | Extract check-in moderation and passport/progress read model helpers. |
| Low | `src/modules/graph/neo4j.service.ts` | 58 | ARCH-5 | `run<T = any>(..., Record<string, any>)` uses `any` in service signature. | Replace with `unknown`/typed Neo4j params and result mapper. |
| Low | `src/modules/auth/service.ts` | 519,553,573 | ARCH-5 | Auth challenge helpers use `any`. | Introduce typed challenge/password-reset aliases. |
| Low | `src/modules/trip/service.ts` | 73,76,233 | ARCH-5 | Trip hydration/detection uses `any`. | Add DTO/domain types for parsed trip points. |
| Low | `src/modules/knowledge-test/service.ts` | 110 | ARCH-5 | `stripOption(opt: any)`. | Type option shape from entity/model. |
| OK | project | n/a | ARCH-2 | No manual `new SomeService()` in application code. Test-only `new MetricsService()` is acceptable. | None. |
| OK | project | n/a | ARCH-3 | `npx madge --extensions ts --circular src` processed 247 files and found no circular dependencies. | None. |

## Code Quality

| Service | Result | Findings |
|---|---|---|
| AuthService | Mostly OK | Uses Nest exceptions; strong happy/error path tests. Replace remaining `any` helper signatures. |
| UserService | Mostly OK | Uses Nest exceptions and DTOs. Add duplicate-email conflict handling at service layer if admin/user email updates are exposed. |
| MailService | Needs work | Throws bare `Error` for missing template/unsupported mail type at lines 170 and 189. Replace with `InternalServerErrorException` or domain-specific exception. |
| DiscussService | Needs work | Throws bare `Error('Failed to create Discuss')` at line 19. Replace with Nest exception. |
| MindMapService | Needs work | Throws bare `Error` at lines 71, 97, 129, 141, 148. Replace with `BadRequestException`, `ServiceUnavailableException`, or `InternalServerErrorException` as appropriate. |
| Neo4jService | Needs work | Throws bare `Error` when driver is unavailable. Replace with `ServiceUnavailableException`. |
| PersonaService | Needs work | Throws bare `Error` for not found/LLM errors. Replace with `NotFoundException` and `ServiceUnavailableException`. |
| All controllers | OK baseline | Global `ValidationPipe` has `whitelist: true` and `forbidNonWhitelisted: true`. |
| Project | Gap | `strictNullChecks` is not enabled explicitly in `tsconfig.json`. |
| Project | Not run | `jscpd` is not installed; duplication scan not executed. |

## Database

| Priority | Finding | Evidence | Suggested Fix |
|---|---|---|---|
| High | Multi-table writes are not consistently transactional. | Auth signup/session/audit and knowledge-test attempt/leaderboard flows write multiple tables. | Add transaction wrappers one service at a time, starting with Auth and KnowledgeTest attempt submission. |
| Medium | Indexes are partial. | Heritage has indexes on slug/status/search; timeline date; relations from/to. User email/googleId are indexed by unique columns. | Add indexes for frequent filters: comments `heritage_id`, favorites `user_id/heritage_id`, sessions `refresh_token_hash`, chat messages `chat_room_id`. |
| Medium | Some list/read helpers may be unbounded. | Graph/admin and some lookup methods return full sets. | Keep public endpoints paginated; restrict admin bulk endpoints or document expected bounded dataset. |
| OK | Connection settings explicit. | `DATABASE_MAX_CONNECTIONS`, `connectTimeout`, pool size set in config. | Continue using env/config. |
| OK | Docker persistence. | `postgres_data`, `postgres_backups`, `neo4j_*` named volumes configured. | Do not use `docker compose down -v` unless wiping data intentionally. |
| OK | PostGIS enabled. | Postgres image changed to `postgis/postgis:16-3.4`; migration enables `postgis`. | Verify with `make db-postgis` after containers start. |

## Security

| Priority | Finding | Evidence | Suggested Fix |
|---|---|---|---|
| High | `npm audit` reports 39 vulnerabilities: 1 critical, 15 high, 18 moderate, 5 low. | Critical: `class-validator <0.14.0`; high: `jsonwebtoken`, `multer`, `nodemailer`, `ws`, `body-parser`, etc. | Plan dependency upgrade batch. Prefer upgrade NestJS stack and class-validator first, with full regression testing. |
| High | Secrets exist in local `.env`. | Neo4j password and DB password are present in ignored `.env`. | Keep `.env` untracked; rotate any credential that was shared outside local machine. Use secret manager for prod. |
| Medium | Authorization is primarily guard/controller-level. | Service methods often trust caller `userId`/role. | Add service-level ownership/RBAC checks for critical mutations. |
| Medium | External API errors may leak operational detail. | MindMap/RAG/persona throw generic errors with upstream status. | Normalize client-safe exceptions; log internals server-side only. |
| OK | No SQL logging. | TypeORM `logging: false`. | None. |
| OK | No runtime `console.log` in main service paths found by grep; seed script logs remain. | `console.*` matches are seed-only after cleanup. | Keep seed scripts excluded from runtime logging policy. |

## Performance

| Priority | Finding | Evidence | Suggested Fix |
|---|---|---|---|
| Medium | Email sending is synchronous in auth flows. | `signUp`, `forgotPassword`, `resendOtp` await mail service. | Move mail to queue/event worker after auth correctness is stable. |
| Medium | AI sync/backfill can block request path or run long. | Heritage CRUD calls AI sync fire-and-forget; backfill loops sequentially. | Move AI sync/backfill to queue with retry/backoff and status tracking. |
| Medium | Graph fallback reads all nodes/edges. | `GraphRepository` builds full views from all rows. | Add caching and pagination/bounds for large graph datasets. |
| OK | Basic response metrics exist. | Prometheus metrics exposed at `/api/metrics`. | Add dashboard/alerts for p95 latency/error rate. |

## Logging & Monitoring

| Priority | Finding | Evidence | Suggested Fix |
|---|---|---|---|
| Medium | Logger is not JSON structured. | Uses Nest `Logger` and custom request middleware text logs. | Adopt `nestjs-pino` or Winston JSON format for production. |
| Medium | Health check is shallow. | `/api/ping` exists; no DB/cache/external dependency checks. | Add `@nestjs/terminus` checks for Postgres, Neo4j, Redis/cache, AI service. |
| OK | Metrics exist. | `http_requests_total`, `http_request_duration_seconds`, default process metrics. | Add error-rate and dependency metrics next. |
| Gap | Logs do not consistently include user id. | Request logger has trace id/ip, not authenticated user id. | Add request context middleware/interceptor after auth. |

## Testing

| Area | Result |
|---|---|
| Unit tests | `npm test -- --runInBand`: 32 suites, 383 tests passed before coverage run. |
| Coverage | `npm run test:cov -- --runInBand`: all tests passed; global statement coverage 41.87%, branch 17.54%, functions 26.65%, lines 41.96%. |
| Critical coverage | AuthService coverage is high: 98.38% statements, 90.09% branches. UserService is lower: 45.31% statements. |
| Gaps | No real DB integration suite verified in this audit; graph, RAG, mind-map, trip, gamification, mcp-token have near-zero coverage. |
| CI | Not verified in this run. |

## Dockerized Database Setup

Implemented changes:

- Postgres image changed to `postgis/postgis:16-3.4`.
- Postgres persistent volumes:
  - `postgres_data:/var/lib/postgresql/data`
  - `postgres_backups:/backups`
- Neo4j image changed to `neo4j:5-community`.
- Neo4j persistent volumes:
  - `neo4j_data:/data`
  - `neo4j_logs:/logs`
  - `neo4j_import:/var/lib/neo4j/import`
  - `neo4j_plugins:/plugins`
- Healthchecks configured for Postgres and Neo4j.
- Migration enables both `pgcrypto` and `postgis`.
- `Makefile` includes:
  - `make db-backup`
  - `make db-backups`
  - `make db-restore file=<dump>`
  - `make db-postgis`

Verification blocked in this environment: Docker CLI is not installed here, so `docker compose up` and PostGIS runtime verification could not be executed by the agent.

## Prioritized Backlog

| Priority | Item | Suggested Batch |
|---|---|---|
| High | Upgrade vulnerable dependencies, starting with `class-validator`, `jsonwebtoken`, `multer`, Nest platform packages. | One dependency family per PR with full tests. |
| High | Add transactions to critical multi-table writes in Auth and KnowledgeTest attempt flows. | Auth first, then KnowledgeTest. |
| High | Replace bare `Error` throws in MindMap, Mail, Neo4j, Persona, Discuss services with Nest exceptions. | One service per PR. |
| Medium | Add DB/Neo4j/cache health checks with Terminus. | Observability PR. |
| Medium | Add JSON structured logging and user id in request context. | Logging PR. |
| Medium | Queue email and AI sync/backfill. | Async jobs PR after Redis/BullMQ decision. |
| Medium | Add indexes for sessions, comments, favorites, chat messages. | Migration PR. |
| Low | Enable stricter TypeScript (`strictNullChecks`) and reduce `any` in service signatures. | Gradual type-hardening PRs. |
| Low | Raise coverage for User, KnowledgeTest, Trip, Gamification, Graph, RAG, MindMap. | Service-by-service test PRs. |
