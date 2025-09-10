import { Surreal } from 'surrealdb'

class Database {
  private static instance: Database
  private db: Surreal

  private constructor() {
    this.db = new Surreal()
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  public async connect() {
    try {
      await this.db.connect(process.env.SURREALDB_URL || 'http://localhost:8000')
      
      await this.db.signin({
        username: process.env.SURREALDB_USER || 'root',
        password: process.env.SURREALDB_PASS || 'root',
      })

      await this.db.use({
        namespace: process.env.SURREALDB_NS || 'spottisahko',
        database: process.env.SURREALDB_DB || 'main',
      })

      console.log('Connected to SurrealDB')
      await this.initializeSchema()
    } catch (error) {
      console.error('Failed to connect to SurrealDB:', error)
      throw error
    }
  }

  private async initializeSchema() {
    try {
      // Check if tables already exist to avoid errors - wrap in try/catch
      let existingTables = {}
      try {
        const tables = await this.db.query('INFO FOR DB')
        existingTables = (tables[0] as any)?.tb || {}
      } catch (error) {
        // If INFO FOR DB fails, assume tables don't exist
        console.log('Could not check existing tables, proceeding with creation')
      }
      
      // Only create tables if they don't exist
      if (!(existingTables as any).electricity_price) {
        try {
          await this.db.query(`
            DEFINE TABLE electricity_price SCHEMAFULL;
            DEFINE FIELD timestamp ON electricity_price TYPE datetime ASSERT $value != NONE;
            DEFINE FIELD price_cents_kwh ON electricity_price TYPE number ASSERT $value >= 0;
            DEFINE FIELD price_area ON electricity_price TYPE string ASSERT $value != NONE;
            DEFINE FIELD forecast ON electricity_price TYPE bool;
            DEFINE INDEX unique_price ON electricity_price COLUMNS timestamp, price_area UNIQUE;
            DEFINE INDEX timestamp_idx ON electricity_price COLUMNS timestamp;
          `)
        } catch (error) {
          console.log('Table electricity_price may already exist, continuing...')
        }
      }

      if (!(existingTables as any).daily_stats) {
        try {
          await this.db.query(`
            DEFINE TABLE daily_stats SCHEMAFULL;
            DEFINE FIELD date ON daily_stats TYPE datetime ASSERT $value != NONE;
            DEFINE FIELD avg_price ON daily_stats TYPE number ASSERT $value >= 0;
            DEFINE FIELD min_price ON daily_stats TYPE number ASSERT $value >= 0;
            DEFINE FIELD max_price ON daily_stats TYPE number ASSERT $value >= 0;
            DEFINE FIELD median_price ON daily_stats TYPE number ASSERT $value >= 0;
            DEFINE INDEX unique_date ON daily_stats COLUMNS date UNIQUE;
          `)
        } catch (error) {
          console.log('Table daily_stats may already exist, continuing...')
        }
      }

      if (!(existingTables as any).blog_posts) {
        try {
          await this.db.query(`
            DEFINE TABLE blog_posts SCHEMAFULL;
            DEFINE FIELD slug ON blog_posts TYPE string ASSERT $value != NONE;
            DEFINE FIELD title ON blog_posts TYPE string ASSERT $value != NONE;
            DEFINE FIELD content ON blog_posts TYPE string ASSERT $value != NONE;
            DEFINE FIELD meta_description ON blog_posts TYPE string;
            DEFINE FIELD keywords ON blog_posts TYPE array;
            DEFINE FIELD published_at ON blog_posts TYPE datetime ASSERT $value != NONE;
            DEFINE FIELD views ON blog_posts TYPE number DEFAULT 0;
            DEFINE INDEX unique_slug ON blog_posts COLUMNS slug UNIQUE;
            DEFINE INDEX published_idx ON blog_posts COLUMNS published_at;
          `)
        } catch (error) {
          console.log('Table blog_posts may already exist, continuing...')
        }
      }

      if (!(existingTables as any).page_views) {
        try {
          await this.db.query(`
            DEFINE TABLE page_views SCHEMAFULL;
            DEFINE FIELD path ON page_views TYPE string ASSERT $value != NONE;
            DEFINE FIELD timestamp ON page_views TYPE datetime ASSERT $value != NONE;
            DEFINE FIELD user_agent ON page_views TYPE string;
            DEFINE FIELD referrer ON page_views TYPE string;
            DEFINE INDEX path_idx ON page_views COLUMNS path;
            DEFINE INDEX timestamp_idx ON page_views COLUMNS timestamp;
          `)
        } catch (error) {
          console.log('Table page_views may already exist, continuing...')
        }
      }

      console.log('Database schema initialized')
    } catch (error) {
      console.error('Failed to initialize schema:', error)
      // Don't throw error for schema initialization failures in production
      if (process.env.NODE_ENV !== 'production') {
        throw error
      }
    }
  }

  public getDb(): Surreal {
    return this.db
  }

  public async disconnect() {
    await this.db.close()
  }
}

export const database = Database.getInstance()
export { Database }