// DEMO ONLY — do not run against a production database.
// Inserts 5 sample rows per table to showcase entity relationships.
// Run via: make seed-sample
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

// ── Structs ────────────────────────────────────────────────────────────────────

type Role struct {
	RoleID int    `json:"role_id"`
	Name   string `json:"name"`
}

type Priority struct {
	PriorityID int    `json:"priority_id"`
	Name       string `json:"name"`
}

type User struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	RoleID int    `json:"role_id"`
}

type UserSession struct {
	SessionID int    `json:"session_id"`
	UserID    int    `json:"user_id"`
	TokenHash string `json:"token_hash"`
	ExpiresAt string `json:"expires_at"`
}

type Friendship struct {
	UserID       int    `json:"user_id"`
	FriendID     int    `json:"friend_id"`
	DateFriended string `json:"date_friended"`
}

type FriendRequest struct {
	RequestID  int `json:"request_id"`
	SenderID   int `json:"sender_id"`
	ReceiverID int `json:"receiver_id"`
}

type Message struct {
	MessageID  int    `json:"message_id"`
	SenderID   int    `json:"sender_id"`
	ReceiverID int    `json:"receiver_id"`
	Content    string `json:"content"`
	SentAt     string `json:"sent_at"`
}

type Genre struct {
	GenreID int    `json:"genre_id"`
	Title   string `json:"title"`
}

type MediaItem struct {
	MediaID   int    `json:"media_id"`
	Title     string `json:"title"`
	MediaType string `json:"media_type"`
}

type MediaItemGenre struct {
	MediaID int `json:"media_id"`
	GenreID int `json:"genre_id"`
}

type ConsumptionLog struct {
	LogID        int    `json:"log_id"`
	UserID       int    `json:"user_id"`
	MediaID      int    `json:"media_id"`
	DateConsumed string `json:"date_consumed"`
	TimeConsumed int    `json:"time_consumed"`
}

type Goal struct {
	GoalID     int    `json:"goal_id"`
	UserID     int    `json:"user_id"`
	PriorityID int    `json:"priority_id"`
	Title      string `json:"title"`
	DueDate    string `json:"due_date"`
	Completed  int    `json:"completed"`
}

type SampleData struct {
	Roles          []Role           `json:"roles"`
	Priorities     []Priority       `json:"priorities"`
	Users          []User           `json:"users"`
	UserSessions   []UserSession    `json:"user_sessions"`
	Friendships    []Friendship     `json:"friendships"`
	FriendRequests []FriendRequest  `json:"friend_requests"`
	Messages       []Message        `json:"messages"`
	Genres         []Genre          `json:"genres"`
	MediaItems     []MediaItem      `json:"media_items"`
	MediaItemGenres []MediaItemGenre `json:"media_item_genres"`
	ConsumptionLogs []ConsumptionLog `json:"consumption_logs"`
	Goals          []Goal           `json:"goals"`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const demoPasswordHash = "pbkdf2_sha256$260000$bXltZWRpYWpvdXJuYWwtZGVtby1zYWx0$KWX+bt7xqfYOAF1HSSd0oYmaGZssMFqZcSkOZoadhjA="

func mustExec(ctx context.Context, conn *pgx.Conn, sql string, args ...any) {
	if _, err := conn.Exec(ctx, sql, args...); err != nil {
		log.Fatalf("query failed: %v\nSQL: %s", err, sql)
	}
}

// ── Main ───────────────────────────────────────────────────────────────────────

func main() {
	ctx := context.Background()

	_ = godotenv.Load("../../backend/.env")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://mmj_user:mmj_password@localhost:5432/mymediajournal"
	}
	dbURL = strings.Replace(dbURL, "postgresql+psycopg://", "postgres://", 1)

	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}
	defer conn.Close(ctx)

	data, err := os.ReadFile("sample.json")
	if err != nil {
		log.Fatalf("unable to read sample.json: %v", err)
	}

	var sample SampleData
	if err := json.Unmarshal(data, &sample); err != nil {
		log.Fatalf("unable to parse sample.json: %v", err)
	}

	fmt.Println("Inserting sample data (demo only)...\n")

	for _, r := range sample.Roles {
		mustExec(ctx, conn,
			`INSERT INTO role (role_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			r.RoleID, r.Name)
	}
	fmt.Printf("✓ %d roles\n", len(sample.Roles))

	for _, p := range sample.Priorities {
		mustExec(ctx, conn,
			`INSERT INTO priority (priority_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			p.PriorityID, p.Name)
	}
	fmt.Printf("✓ %d priorities\n", len(sample.Priorities))

	for _, u := range sample.Users {
		mustExec(ctx, conn,
			`INSERT INTO "user" (user_id, name, email, password_hash, role_id)
			 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
			u.UserID, u.Name, u.Email, demoPasswordHash, u.RoleID)
	}
	fmt.Printf("✓ %d users\n", len(sample.Users))

	for _, s := range sample.UserSessions {
		mustExec(ctx, conn,
			`INSERT INTO user_session (session_id, user_id, token_hash, expires_at)
			 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
			s.SessionID, s.UserID, s.TokenHash, s.ExpiresAt)
	}
	fmt.Printf("✓ %d user sessions\n", len(sample.UserSessions))

	for _, f := range sample.Friendships {
		mustExec(ctx, conn,
			`INSERT INTO friendship (user_id, friend_id, date_friended)
			 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			f.UserID, f.FriendID, f.DateFriended)
	}
	fmt.Printf("✓ %d friendships\n", len(sample.Friendships))

	for _, fr := range sample.FriendRequests {
		mustExec(ctx, conn,
			`INSERT INTO friend_request (request_id, sender_id, receiver_id)
			 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			fr.RequestID, fr.SenderID, fr.ReceiverID)
	}
	fmt.Printf("✓ %d friend requests\n", len(sample.FriendRequests))

	for _, m := range sample.Messages {
		mustExec(ctx, conn,
			`INSERT INTO message (message_id, sender_id, receiver_id, content, sent_at)
			 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
			m.MessageID, m.SenderID, m.ReceiverID, m.Content, m.SentAt)
	}
	fmt.Printf("✓ %d messages\n", len(sample.Messages))

	for _, g := range sample.Genres {
		mustExec(ctx, conn,
			`INSERT INTO genre (genre_id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			g.GenreID, g.Title)
	}
	fmt.Printf("✓ %d genres\n", len(sample.Genres))

	for _, mi := range sample.MediaItems {
		mustExec(ctx, conn,
			`INSERT INTO media_item (media_id, title, media_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			mi.MediaID, mi.Title, mi.MediaType)
	}
	fmt.Printf("✓ %d media items\n", len(sample.MediaItems))

	for _, mg := range sample.MediaItemGenres {
		mustExec(ctx, conn,
			`INSERT INTO media_item_genre (media_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			mg.MediaID, mg.GenreID)
	}
	fmt.Printf("✓ %d media item genres\n", len(sample.MediaItemGenres))

	for _, cl := range sample.ConsumptionLogs {
		mustExec(ctx, conn,
			`INSERT INTO consumption_log (log_id, user_id, media_id, date_consumed, time_consumed)
			 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
			cl.LogID, cl.UserID, cl.MediaID, cl.DateConsumed, cl.TimeConsumed)
	}
	fmt.Printf("✓ %d consumption logs\n", len(sample.ConsumptionLogs))

	for _, g := range sample.Goals {
		mustExec(ctx, conn,
			`INSERT INTO goal (goal_id, user_id, priority_id, title, due_date, completed)
			 VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
			g.GoalID, g.UserID, g.PriorityID, g.Title, g.DueDate, g.Completed)
	}
	fmt.Printf("✓ %d goals\n", len(sample.Goals))

	fmt.Println("\nSample seeding complete!")
}
