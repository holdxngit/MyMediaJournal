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

type User struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
}

type Genre struct {
	GenreID int    `json:"genre_id"`
	Title   string `json:"title"`
}

type Source struct {
	SourceID int    `json:"source_id"`
	Title    string `json:"title"`
}

type MediaItem struct {
	MediaID   int    `json:"media_id"`
	Title     string `json:"title"`
	MediaType string `json:"media_type"`
}

type Friendship struct {
	FriendID     int    `json:"friend_id"`
	UserID       int    `json:"user_id"`
	DateFriended string `json:"date_friended"`
}

type MediaItemGenre struct {
	MediaID int `json:"media_id"`
	GenreID int `json:"genre_id"`
}

type MediaItemSource struct {
	MediaID  int `json:"media_id"`
	SourceID int `json:"source_id"`
}

type GenreSimilarity struct {
	GenreID1 int `json:"genre_id_1"`
	GenreID2 int `json:"genre_id_2"`
}

type ConsumptionLog struct {
	LogID        int    `json:"log_id"`
	UserID       int    `json:"user_id"`
	MediaID      int    `json:"media_id"`
	DateConsumed string `json:"date_consumed"`
	TimeConsumed int    `json:"time_consumed"`
}

type Goal struct {
	GoalID    int     `json:"goal_id"`
	UserID    int     `json:"user_id"`
	GenreID   *int    `json:"genre_id"`
	Title     string  `json:"title"`
	MediaType *string `json:"media_type"`
	Quantity  int     `json:"quantity"`
	StartDate string  `json:"start_date"`
}

type WrappedReport struct {
	ReportID      int  `json:"report_id"`
	UserID        int  `json:"user_id"`
	MostUsedMedia *int `json:"most_used_media"`
	Goal          *int `json:"goal"`
}

type SeedData struct {
	Users             []User            `json:"users"`
	Genres            []Genre           `json:"genres"`
	Sources           []Source          `json:"sources"`
	MediaItems        []MediaItem       `json:"media_items"`
	Friendships       []Friendship      `json:"friendships"`
	MediaItemGenres   []MediaItemGenre  `json:"media_item_genres"`
	MediaItemSources  []MediaItemSource `json:"media_item_sources"`
	GenreSimilarities []GenreSimilarity `json:"genre_similarities"`
	ConsumptionLogs   []ConsumptionLog  `json:"consumption_logs"`
	Goals             []Goal            `json:"goals"`
	WrappedReports    []WrappedReport   `json:"wrapped_reports"`
}

func mustExec(ctx context.Context, conn *pgx.Conn, sql string, args ...any) {
	if _, err := conn.Exec(ctx, sql, args...); err != nil {
		log.Fatalf("query failed: %v\nSQL: %s", err, sql)
	}
}

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

	data, err := os.ReadFile("seed.json")
	if err != nil {
		log.Fatalf("unable to read seed.json: %v", err)
	}

	var seed SeedData
	if err := json.Unmarshal(data, &seed); err != nil {
		log.Fatalf("unable to parse seed.json: %v", err)
	}

	for _, u := range seed.Users {
		mustExec(ctx, conn,
			`INSERT INTO "user" (user_id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			u.UserID, u.Email)
	}
	fmt.Printf("✓ %d users\n", len(seed.Users))

	for _, g := range seed.Genres {
		mustExec(ctx, conn,
			`INSERT INTO genre (genre_id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			g.GenreID, g.Title)
	}
	fmt.Printf("✓ %d genres\n", len(seed.Genres))

	for _, s := range seed.Sources {
		mustExec(ctx, conn,
			`INSERT INTO source (source_id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			s.SourceID, s.Title)
	}
	fmt.Printf("✓ %d sources\n", len(seed.Sources))

	for _, m := range seed.MediaItems {
		mustExec(ctx, conn,
			`INSERT INTO media_item (media_id, title, media_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			m.MediaID, m.Title, m.MediaType)
	}
	fmt.Printf("✓ %d media items\n", len(seed.MediaItems))

	for _, f := range seed.Friendships {
		mustExec(ctx, conn,
			`INSERT INTO friendship (friend_id, user_id, date_friended) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			f.FriendID, f.UserID, f.DateFriended)
	}
	fmt.Printf("✓ %d friendships\n", len(seed.Friendships))

	for _, mg := range seed.MediaItemGenres {
		mustExec(ctx, conn,
			`INSERT INTO media_item_genre (media_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			mg.MediaID, mg.GenreID)
	}
	fmt.Printf("✓ %d media item genres\n", len(seed.MediaItemGenres))

	for _, ms := range seed.MediaItemSources {
		mustExec(ctx, conn,
			`INSERT INTO media_item_source (media_id, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			ms.MediaID, ms.SourceID)
	}
	fmt.Printf("✓ %d media item sources\n", len(seed.MediaItemSources))

	for _, gs := range seed.GenreSimilarities {
		mustExec(ctx, conn,
			`INSERT INTO genre_similarity (genre_id_1, genre_id_2) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			gs.GenreID1, gs.GenreID2)
	}
	fmt.Printf("✓ %d genre similarities\n", len(seed.GenreSimilarities))

	for _, cl := range seed.ConsumptionLogs {
		mustExec(ctx, conn,
			`INSERT INTO consumption_log (log_id, user_id, media_id, date_consumed, time_consumed)
			 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
			cl.LogID, cl.UserID, cl.MediaID, cl.DateConsumed, cl.TimeConsumed)
	}
	fmt.Printf("✓ %d consumption logs\n", len(seed.ConsumptionLogs))

	for _, g := range seed.Goals {
		mustExec(ctx, conn,
			`INSERT INTO goal (goal_id, user_id, genre_id, title, media_type, quantity, start_date)
			 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
			g.GoalID, g.UserID, g.GenreID, g.Title, g.MediaType, g.Quantity, g.StartDate)
	}
	fmt.Printf("✓ %d goals\n", len(seed.Goals))

	for _, wr := range seed.WrappedReports {
		mustExec(ctx, conn,
			`INSERT INTO wrapped_report (report_id, user_id, most_used_media, goal)
			 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
			wr.ReportID, wr.UserID, wr.MostUsedMedia, wr.Goal)
	}
	fmt.Printf("✓ %d wrapped reports\n", len(seed.WrappedReports))

	for _, q := range []string{
		`SELECT setval(pg_get_serial_sequence('"user"', 'user_id'), COALESCE(MAX(user_id), 1)) FROM "user"`,
		`SELECT setval(pg_get_serial_sequence('genre', 'genre_id'), COALESCE(MAX(genre_id), 1)) FROM genre`,
		`SELECT setval(pg_get_serial_sequence('source', 'source_id'), COALESCE(MAX(source_id), 1)) FROM source`,
		`SELECT setval(pg_get_serial_sequence('media_item', 'media_id'), COALESCE(MAX(media_id), 1)) FROM media_item`,
		`SELECT setval(pg_get_serial_sequence('consumption_log', 'log_id'), COALESCE(MAX(log_id), 1)) FROM consumption_log`,
		`SELECT setval(pg_get_serial_sequence('goal', 'goal_id'), COALESCE(MAX(goal_id), 1)) FROM goal`,
		`SELECT setval(pg_get_serial_sequence('wrapped_report', 'report_id'), COALESCE(MAX(report_id), 1)) FROM wrapped_report`,
	} {
		if _, err := conn.Exec(ctx, q); err != nil {
			log.Printf("warning: sequence reset failed: %v", err)
		}
	}

	fmt.Println("\nSeeding complete!")
}
