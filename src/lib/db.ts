import { Surreal } from 'surrealdb'

class Database {
  private static instance: Database
  private db: Surreal
  private isConnected: boolean = false
  private connectionPromise: Promise<void> | null = null
  private lastHealthCheck: number = 0
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

  private constructor() {
    this.db = new Surreal()
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  public async connect(): Promise<void> {
    // If already connected and healthy, return
    if (this.isConnected && this.isConnectionHealthy()) {
      return
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    // Start new connection
    this.connectionPromise = this.establishConnection()
    
    try {
      await this.connectionPromise
    } finally {
      this.connectionPromise = null
    }
  }

  private async establishConnection(): Promise<void> {
    try {
      // Close existing connection if any
      if (this.isConnected) {
        try {
          await this.db.close()
        } catch (error) {
          // Ignore close errors
        }
        this.isConnected = false
      }

      // Create new connection
      await this.db.connect(process.env.SURREALDB_URL || 'http://localhost:8000')
      
      // For development with memory database, use root authentication
      await this.db.signin({
        username: process.env.SURREALDB_USER || 'root',
        password: process.env.SURREALDB_PASS || 'root',
      })

      await this.db.use({
        namespace: process.env.SURREALDB_NS || 'spottisahko',
        database: process.env.SURREALDB_DB || 'main',
      })

      this.isConnected = true
      this.lastHealthCheck = Date.now()
      console.log('Connected to SurrealDB')
      
      // Only initialize schema once per app lifecycle
      if (!process.env.SCHEMA_INITIALIZED) {
        await this.initializeSchema()
        process.env.SCHEMA_INITIALIZED = 'true'
      }
    } catch (error) {
      console.error('Failed to connect to SurrealDB:', error)
      this.isConnected = false
      throw error
    }
  }

  private isConnectionHealthy(): boolean {
    return Date.now() - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL
  }

  private async checkHealth(): Promise<boolean> {
    if (!this.isConnected) {
      return false
    }

    try {
      await this.db.query('SELECT 1')
      this.lastHealthCheck = Date.now()
      return true
    } catch (error) {
      console.log('Database health check failed:', error)
      this.isConnected = false
      return false
    }
  }

  public async ensureConnection() {
    // Check connection health periodically
    if (!this.isConnected || !this.isConnectionHealthy()) {
      const isHealthy = await this.checkHealth()
      if (!isHealthy) {
        await this.connect()
      }
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

  public async getDb(): Promise<Surreal> {
    await this.ensureConnection()
    return this.db
  }

  public async query<T = any>(sql: string, params?: Record<string, any>, retries = 1): Promise<T> {
    for (let i = 0; i <= retries; i++) {
      try {
        const db = await this.getDb()
        return await db.query<T>(sql, params)
      } catch (error: any) {
        // If it's a token expiration or connection error, try to reconnect
        if ((error?.message?.includes('token has expired') || 
             error?.message?.includes('permissions') ||
             error?.status === 401) && i < retries) {
          console.log('Database connection error, attempting reconnection...')
          this.isConnected = false
          await this.connect()
          continue
        }
        throw error
      }
    }
    throw new Error('Max retries exceeded')
  }

  public getDbSync(): Surreal {
    return this.db
  }

  public async disconnect() {
    this.isConnected = false
    await this.db.close()
  }
}

export const database = Database.getInstance()
export { Database }