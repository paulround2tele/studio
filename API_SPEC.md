openapi: 3.0.0
info:
  title: DomainFlow API
  version: 2.0
  description: DomainFlow API v2 provides a comprehensive REST API for domain generation, validation, and campaign management.
  contact:
    name: API Support
    url: http://www.domainflow.com/support
    email: support@domainflow.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: http://localhost:8080/api/v2
paths:
  /auth/login:
    post:
      summary: User login
      description: Authenticate a user with email and password.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
  /auth/logout:
    post:
      summary: User logout
      responses:
        '200':
          description: Logout successful
  /auth/status:
    get:
      summary: Session status
      responses:
        '200':
          description: Session status
          content:
            application/json:
              schema:
                type: object
                properties:
                  authenticated:
                    type: boolean
                  user:
                    $ref: '#/components/schemas/User'
  /campaigns:
    get:
      summary: List campaigns
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: status
          in: query
          schema:
            type: string
        - name: type
          in: query
          schema:
            type: string
      responses:
        '200':
          description: A list of campaigns
          content:
            application/json:
              schema:
                type: object
                properties:
                  campaigns:
                    type: array
                    items:
                      $ref: '#/components/schemas/Campaign'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
    post:
      summary: Create a campaign
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Campaign'
      responses:
        '201':
          description: Campaign created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Campaign'
  /campaigns/{id}:
    get:
      summary: Get a campaign
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: A single campaign
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Campaign'
    put:
      summary: Update a campaign
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Campaign'
      responses:
        '200':
          description: Campaign updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Campaign'
    delete:
      summary: Delete a campaign
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: Campaign deleted
  /campaigns/{id}/start:
    post:
      summary: Start a campaign
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Campaign started
  /campaigns/{id}/stop:
    post:
      summary: Stop a campaign
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Campaign stopped
  /campaigns/{id}/results:
    get:
      summary: Get campaign results
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: status
          in: query
          schema:
            type: string
      responses:
        '200':
          description: A list of campaign results
  /admin/users:
    get:
      summary: List users
      responses:
        '200':
          description: A list of users
          content:
            application/json:
              schema:
                type: object
                properties:
                  users:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
    post:
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /admin/users/{id}:
    put:
      summary: Update a user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    delete:
      summary: Delete a user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: User deleted
  /keyword-sets:
    get:
      summary: List keyword sets
      responses:
        '200':
          description: A list of keyword sets
    post:
      summary: Create a keyword set
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/KeywordSet'
      responses:
        '201':
          description: Keyword set created
  /personas:
    get:
      summary: List personas
      responses:
        '200':
          description: A list of personas
    post:
      summary: Create a persona
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Persona'
      responses:
        '201':
          description: Persona created
  /proxies:
    get:
      summary: List proxies
      responses:
        '200':
          description: A list of proxies
    post:
      summary: Create a proxy
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Proxy'
      responses:
        '201':
          description: Proxy created
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        username:
          type: string
        email:
          type: string
        role:
          type: string
          enum: [admin, user]
        permissions:
          type: array
          items:
            type: string
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time
        lastLogin:
          type: string
          format: date-time
    Campaign:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        type:
          type: string
          enum: [domain_generation, dns_validation, http_keyword]
        status:
          type: string
          enum: [pending, running, completed, failed]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        userId:
          type: string
          format: uuid
        parameters:
          type: object
        progress:
          $ref: '#/components/schemas/CampaignProgress'
    CampaignProgress:
      type: object
      properties:
        totalItems:
          type: integer
        processedItems:
          type: integer
        successCount:
          type: integer
        errorCount:
          type: integer
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
    KeywordSet:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        keywords:
          type: array
          items:
            type: string
    Persona:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        userAgent:
          type: string
        acceptLanguage:
          type: string
        acceptEncoding:
          type: string
    Proxy:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        host:
          type: string
        port:
          type: integer
        protocol:
          type: string
          enum: [http, https, socks5]
        username:
          type: string
        password:
          type: string
