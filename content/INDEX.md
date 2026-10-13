# DS / AI Interview Prep — Knowledge Index

## Role → Section Map

Priority roles: **DS, AI DS, DE, DA, MLE, AI Developer**

| Section | DS / AI DS | DA / BI | DE | MLE | AI Dev / AI Eng | MLOps / DevOps |
|---|---|---|---|---|---|---|
| 1. SQL | ★★★ | ★★★ | ★★★ | ★★ | ★ | ★ |
| 2. Python & Data Manipulation | ★★★ | ★★ | ★★★ | ★★★ | ★★★ | ★★ |
| 3. Math Foundations | ★★ | ★ | – | ★★★ | ★ | – |
| 4. Probability | ★★★ | ★★ | – | ★★ | ★ | – |
| 5. Statistics & Inference | ★★★ | ★★★ | – | ★★ | ★ | – |
| 6. Experimentation & Causal Inference | ★★★ | ★★★ | – | ★ | ★ | – |
| 7. Machine Learning | ★★★ | ★ | ★ | ★★★ | ★★ | ★ |
| 8. Deep Learning | ★★ | – | – | ★★★ | ★★ | – |
| 9. NLP & LLMs | ★★ | – | – | ★★★ | ★★★ | – |
| 10. GenAI Application Engineering | ★★ | – | ★ | ★★ | ★★★ | ★ |
| 11. Computer Vision | ★ | – | – | ★★ | ★ | – |
| 12. Time Series & Forecasting | ★★ | ★★ | – | ★★ | – | – |
| 13. Recommender & Ranking Systems | ★★ | – | – | ★★★ | ★ | – |
| 14. ML System Design | ★★ | – | ★ | ★★★ | ★★ | ★★ |
| 15. MLOps | ★ | – | ★★ | ★★★ | ★★ | ★★★ |
| 16. Data Engineering | ★★ | ★★ | ★★★ | ★★ | ★ | ★★ |
| 17. Cloud, DevOps & DataOps | ★ | – | ★★★ | ★★ | ★★ | ★★★ |
| 18. Data Analysis & BI | ★★ | ★★★ | ★ | – | – | – |
| 19. Product Sense, Metrics & AI PM | ★★★ | ★★★ | – | ★ | ★★ | – |
| 20. Data Structures & Algorithms | ★★ | ★ | ★★ | ★★★ | ★★★ | ★★ |
| 21. Software Engineering for Data/AI | ★ | – | ★★ | ★★★ | ★★★ | ★★★ |
| 22. Consulting & Case Interviews | ★ | ★★ | – | – | ★ | – |
| 23. Behavioral Interviews | ★★★ | ★★★ | ★★★ | ★★★ | ★★★ | ★★★ |

---

## 1. SQL

* SQL Fundamentals
   * SELECT, WHERE, ORDER BY, LIMIT
   * DISTINCT
   * Logical operators, IN, BETWEEN, LIKE
   * NULL handling: IS NULL, COALESCE, NULLIF
   * CASE WHEN
   * Order of execution (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY)
* Aggregation
   * COUNT / SUM / AVG / MIN / MAX
   * GROUP BY, HAVING
   * COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)
   * Conditional aggregation (SUM(CASE WHEN ...))
* Joins
   * INNER / LEFT / RIGHT / FULL OUTER JOIN
   * CROSS JOIN
   * SELF JOIN
   * Anti-join & semi-join (NOT EXISTS, LEFT JOIN ... IS NULL)
   * Join fan-out & duplicate rows
   * Joining on multiple keys / non-equi joins
* Subqueries & CTEs
   * Scalar / correlated subqueries
   * EXISTS vs IN
   * Common Table Expressions (WITH)
   * Recursive CTEs (hierarchies, date spines)
* Set Operations
   * UNION vs UNION ALL
   * INTERSECT, EXCEPT
* Window Functions
   * ROW_NUMBER, RANK, DENSE_RANK
   * NTILE, PERCENT_RANK
   * LAG / LEAD
   * Running totals & moving averages (ROWS BETWEEN)
   * FIRST_VALUE / LAST_VALUE
   * PARTITION BY vs GROUP BY
* Date & String Functions
   * DATE_TRUNC, DATE_DIFF, EXTRACT
   * Time zones
   * String functions: SUBSTRING, CONCAT, SPLIT, REGEXP
* Classic Interview Patterns
   * Top N per group
   * Second highest salary / Nth value
   * Duplicates detection & dedup
   * Consecutive days / gaps and islands
   * Retention & cohort analysis
   * DAU / MAU / stickiness
   * Funnel conversion
   * Month-over-month growth
   * Median & percentiles
   * Pivot / unpivot
   * Sessionization
* Performance & Internals
   * Indexes (B-tree, composite index)
   * EXPLAIN / query plans
   * Partitioning & clustering
   * Normalization (1NF, 2NF, 3NF) vs denormalization
   * Transactions & ACID, isolation levels
* SQL Dialects
   * PostgreSQL / MySQL
   * BigQuery, Snowflake, Spark SQL differences

## 2. Python & Data Manipulation

* Python Core
   * Data types, mutability
   * List / dict / set comprehensions
   * Functions, *args / **kwargs, lambda
   * Iterators & generators
   * Decorators & context managers
   * OOP: class, inheritance, dunder methods
   * Exceptions
   * Type hints
   * Shallow vs deep copy
   * GIL, threading vs multiprocessing vs asyncio
* NumPy
   * ndarray, shape, dtype
   * Broadcasting
   * Vectorization vs loops
   * Indexing, boolean masks
   * Linear algebra ops
* pandas
   * Series & DataFrame
   * Indexing: loc / iloc
   * Filtering, sorting
   * groupby / agg / transform
   * merge / join / concat
   * pivot_table, melt, stack / unstack
   * apply vs vectorized ops
   * Missing values
   * Datetime handling, resample, rolling
   * Memory & performance (categorical dtype, chunking)
   * pandas ↔ SQL equivalents
* Visualization
   * matplotlib / seaborn basics
   * Choosing the right chart
   * plotly for interactive charts
* Polars & DuckDB (modern alternatives)
* Python Coding Interview Patterns for DS
   * Implement metrics from scratch (precision, recall, AUC)
   * Implement algorithms from scratch (k-means, linear regression, kNN)
   * Data cleaning tasks
   * Simulations (Monte Carlo)

## 3. Math Foundations

* Linear Algebra
   * Vectors, dot product, norms (L1, L2)
   * Matrix multiplication, transpose, inverse
   * Rank, linear independence
   * Eigenvalues & eigenvectors
   * SVD
   * Positive definite matrices
   * Projections
* Calculus
   * Derivatives, chain rule
   * Partial derivatives, gradient
   * Jacobian, Hessian
   * Taylor expansion
* Optimization
   * Convex vs non-convex
   * Gradient descent, learning rate
   * SGD, mini-batch
   * Momentum, RMSProp, Adam
   * Newton's method
   * Lagrange multipliers
   * Closed-form vs iterative solutions
* Information Theory
   * Entropy, cross-entropy
   * KL divergence
   * Mutual information

## 4. Probability

* Basics
   * Sample space, events, axioms
   * Counting: permutations & combinations
   * Conditional probability
   * Independence
   * Law of total probability
   * Bayes' theorem
* Random Variables
   * Discrete vs continuous
   * PMF / PDF / CDF
   * Expectation, variance, covariance, correlation
   * Linearity of expectation
   * Conditional expectation, law of total expectation
* Distributions
   * Bernoulli, Binomial
   * Geometric, Negative Binomial
   * Poisson
   * Uniform
   * Normal
   * Exponential
   * Beta, Gamma
   * Multinomial
   * Log-normal
* Limit Theorems
   * Law of large numbers
   * Central limit theorem
* Classic Interview Problems
   * Dice / coin / card problems
   * Birthday problem
   * Expected number of trials
   * Random walks & gambler's ruin
   * Markov chains
   * Monty Hall
   * Geometric probability

## 5. Statistics & Inference

* Descriptive Statistics
   * Mean, median, mode
   * Variance, standard deviation, IQR
   * Skewness, kurtosis
   * Outliers
* Sampling
   * Sampling methods (simple random, stratified, cluster)
   * Sampling bias, selection bias, survivorship bias
   * Sampling distribution, standard error
* Estimation
   * Point estimates, bias & consistency
   * Maximum likelihood estimation (MLE)
   * Method of moments
   * MAP & Bayesian estimation
* Confidence Intervals
   * CI for mean & proportion
   * Interpretation pitfalls
   * Bootstrap CI
* Hypothesis Testing
   * Null & alternative hypotheses
   * p-value, significance level
   * Type I / Type II error, power
   * One-sided vs two-sided
   * z-test, t-test (one-sample, two-sample, paired)
   * Chi-square test
   * ANOVA
   * Non-parametric tests (Mann-Whitney U, Wilcoxon)
   * Multiple testing (Bonferroni, FDR / Benjamini-Hochberg)
* Regression Analysis
   * OLS assumptions
   * Interpreting coefficients
   * R², adjusted R²
   * Multicollinearity, VIF
   * Heteroscedasticity
   * Logistic regression interpretation (odds ratios)
   * Interaction terms
* Bayesian Statistics
   * Prior, likelihood, posterior
   * Conjugate priors
   * Frequentist vs Bayesian
* Paradoxes & Pitfalls
   * Simpson's paradox
   * Correlation vs causation
   * Regression to the mean

## 6. Experimentation & Causal Inference

* A/B Testing Fundamentals
   * Hypothesis & metric selection
   * Randomization unit
   * Sample size & power analysis
   * MDE (minimum detectable effect)
   * Test duration
* Running Experiments
   * A/A tests
   * Sample ratio mismatch (SRM)
   * Novelty & primacy effects
   * Peeking problem & sequential testing
   * Guardrail metrics
* Analysis
   * Statistical vs practical significance
   * Variance reduction (CUPED)
   * Heterogeneous treatment effects / segmentation
   * Multiple metrics & multiple variants
* Advanced Designs
   * Network effects & interference
   * Cluster / switchback experiments
   * Multi-armed bandits
   * Holdout groups
* Causal Inference (when you can't A/B test)
   * Potential outcomes framework
   * Confounding, DAGs
   * Difference-in-differences
   * Propensity score matching
   * Instrumental variables
   * Regression discontinuity
   * Synthetic control
   * Uplift modeling
* Experiment Case Interviews
   * "Launch or not?" decision framework
   * Conflicting metrics
   * Debugging unexpected results

## 7. Machine Learning

* ML Fundamentals
   * Supervised vs unsupervised vs reinforcement learning
   * Training / validation / test split
   * Bias-variance tradeoff
   * Overfitting & underfitting
   * Regularization (L1, L2, Elastic Net)
   * Cross-validation (k-fold, stratified, time-series split)
   * Data leakage
   * Curse of dimensionality
   * Parametric vs non-parametric
   * Generative vs discriminative models
* Supervised Learning
   * Linear Regression
   * Logistic Regression
   * Naive Bayes
   * k-Nearest Neighbors
   * Support Vector Machines (kernel trick)
   * Decision Trees (Gini, entropy, pruning)
   * Random Forest
   * Boosting: AdaBoost, Gradient Boosting
   * XGBoost / LightGBM / CatBoost
   * Bagging vs boosting vs stacking
* Unsupervised Learning
   * k-Means
   * Hierarchical clustering
   * DBSCAN
   * Gaussian Mixture Models & EM
   * PCA
   * t-SNE, UMAP
   * Anomaly detection (Isolation Forest, One-Class SVM)
   * Association rules
* Feature Engineering
   * Scaling & normalization
   * Encoding categorical variables (one-hot, target encoding)
   * Missing value imputation
   * Feature selection
   * Feature interactions
   * Handling high-cardinality features
* Model Evaluation
   * Regression: MSE, RMSE, MAE, MAPE, R²
   * Classification: accuracy, precision, recall, F1
   * Confusion matrix
   * ROC-AUC vs PR-AUC
   * Log loss
   * Threshold selection
   * Calibration
   * Ranking metrics: NDCG, MAP, MRR
* Practical Issues
   * Imbalanced data (resampling, class weights, SMOTE)
   * Hyperparameter tuning (grid, random, Bayesian)
   * Model interpretability (feature importance, SHAP, LIME)
   * Fairness & bias in ML
* Reinforcement Learning Basics
   * MDP, reward, policy
   * Q-learning
   * Exploration vs exploitation

## 8. Deep Learning

* Neural Network Basics
   * Perceptron, MLP
   * Activation functions (ReLU, sigmoid, tanh, GELU)
   * Forward & backpropagation
   * Loss functions
   * Weight initialization
   * Vanishing / exploding gradients
* Training Techniques
   * Optimizers (SGD, Adam, AdamW)
   * Learning rate schedules
   * Batch normalization, layer normalization
   * Dropout
   * Early stopping
   * Gradient clipping
   * Mixed precision training
* Architectures
   * CNN (convolution, pooling, ResNet)
   * RNN, LSTM, GRU
   * Attention mechanism
   * Transformer (encoder, decoder, positional encoding)
   * Autoencoders, VAE
   * GANs
   * Diffusion models
* Transfer Learning & Fine-tuning
* Frameworks
   * PyTorch basics (tensor, autograd, Dataset / DataLoader, training loop)
   * Hugging Face Transformers

## 9. NLP & LLMs

* Classic NLP
   * Tokenization, stemming, lemmatization
   * Bag of words, TF-IDF
   * n-gram language models
   * Sentiment analysis, NER, text classification
* Embeddings
   * Word2Vec, GloVe
   * Contextual embeddings
   * Sentence embeddings
   * Cosine similarity
* Transformer-based Models
   * Self-attention, multi-head attention
   * BERT (encoder-only)
   * GPT (decoder-only)
   * T5 (encoder-decoder)
   * Tokenizers (BPE, WordPiece)
* Large Language Models
   * Pre-training objectives
   * Scaling laws
   * Instruction tuning
   * RLHF, DPO
   * Context window, KV cache
   * Decoding: greedy, beam search, temperature, top-k, top-p
   * Hallucination
* Fine-tuning
   * Full fine-tuning vs PEFT
   * LoRA, QLoRA
   * When to fine-tune vs prompt vs RAG
* Efficiency
   * Quantization
   * Distillation
   * Inference serving (vLLM, batching)
* Multimodal Models (vision-language)

## 10. GenAI Application Engineering

* Prompt Engineering
   * Zero-shot, few-shot
   * Chain-of-thought
   * System prompts & structured output (JSON)
* LLM APIs
   * OpenAI / Anthropic / open-source model APIs
   * Token cost & latency
   * Streaming, rate limits
* RAG (Retrieval-Augmented Generation)
   * Document loading & chunking strategies
   * Embedding models
   * Vector databases (FAISS, Pinecone, pgvector, Chroma)
   * Hybrid search (BM25 + dense)
   * Reranking
   * Query rewriting
   * GraphRAG / knowledge graphs
* Agents
   * Tool use / function calling
   * ReAct pattern
   * Multi-agent systems
   * Memory
   * MCP (Model Context Protocol)
   * Frameworks: LangChain, LangGraph, LlamaIndex
* NL-to-SQL / Text-to-SQL systems
* Evaluation of LLM Apps
   * Offline eval sets
   * LLM-as-a-judge
   * RAG metrics (faithfulness, relevance, context recall)
   * Human evaluation
* Safety & Guardrails
   * Prompt injection
   * PII handling
   * Content filtering
* LLMOps
   * Prompt versioning
   * Tracing & observability
   * Caching
   * Cost monitoring

## 11. Computer Vision

* Image basics (pixels, channels, augmentation)
* Image classification
* Object detection (YOLO, Faster R-CNN)
* Segmentation (U-Net, SAM)
* Vision Transformers (ViT)
* Depth estimation & 3D vision
* CLIP & vision-language models
* CV evaluation metrics (IoU, mAP)

## 12. Time Series & Forecasting

* Components: trend, seasonality, residual
* Stationarity, ADF test
* Differencing
* ACF / PACF
* Moving averages, exponential smoothing (Holt-Winters)
* AR, MA, ARMA, ARIMA, SARIMA
* Prophet
* ML for time series (lag features, gradient boosting)
* Deep learning for time series (LSTM, Temporal Fusion Transformer)
* Forecast evaluation & backtesting
* Anomaly detection in time series

## 13. Recommender & Ranking Systems

* Collaborative filtering (user-based, item-based)
* Matrix factorization
* Content-based filtering
* Hybrid approaches
* Two-tower models
* Candidate generation → ranking → re-ranking
* Cold start problem
* Implicit vs explicit feedback
* Learning to rank (pointwise, pairwise, listwise)
* Evaluation: offline metrics vs online metrics
* Search ranking basics

## 14. ML System Design

* Design Framework
   * Clarify requirements & business goal
   * Define ML objective & metrics
   * Data collection & labeling
   * Feature design
   * Model selection & baseline
   * Offline evaluation
   * Online evaluation (A/B test)
   * Serving & deployment
   * Monitoring & iteration
* Serving Patterns
   * Batch vs real-time inference
   * Latency vs throughput
   * Feature store
   * Caching
* Scaling
   * Distributed training (data parallel, model parallel)
   * Model compression
* Classic Design Questions
   * Recommendation feed
   * Search ranking
   * Fraud detection
   * Ad click prediction (CTR)
   * Churn prediction
   * Content moderation
   * Demand forecasting
   * RAG chatbot / enterprise Q&A
   * LLM-powered agent system

## 15. MLOps

* ML Lifecycle
* Experiment Tracking (MLflow, Weights & Biases)
* Model Registry & versioning
* Data versioning (DVC)
* ML Pipelines & orchestration (Kubeflow, Airflow, SageMaker / Vertex AI Pipelines)
* Model Serving
   * REST API (FastAPI)
   * Batch scoring
   * Model servers (TorchServe, Triton, BentoML)
* CI/CD for ML
   * Testing data, features, and models
   * Automated retraining
* Monitoring
   * Data drift, concept drift
   * Model performance decay
   * Alerting
* Deployment Strategies
   * Shadow deployment
   * Canary releases
   * Blue-green deployment
* Reproducibility & governance

## 16. Data Engineering

* Data Modeling
   * OLTP vs OLAP
   * Star schema, snowflake schema
   * Fact & dimension tables
   * Slowly changing dimensions (SCD Type 1/2)
   * Data vault basics
   * One Big Table vs dimensional
* Storage
   * Data warehouse (Snowflake, BigQuery, Redshift)
   * Data lake
   * Lakehouse (Delta Lake, Iceberg)
   * File formats: CSV, JSON, Parquet, Avro, ORC
   * Row vs columnar storage
   * Partitioning & bucketing
* ETL / ELT
   * ETL vs ELT
   * Batch pipelines
   * Incremental loads & CDC (change data capture)
   * Idempotency & backfills
   * dbt
* Distributed Processing
   * MapReduce concepts
   * Apache Spark architecture (driver, executors, DAG)
   * RDD vs DataFrame
   * Transformations vs actions, lazy evaluation
   * Shuffle, data skew, broadcast join
   * PySpark
* Streaming
   * Batch vs streaming
   * Kafka (topics, partitions, consumer groups)
   * Spark Structured Streaming / Flink
   * Windowing, watermarks
   * Exactly-once semantics
* Orchestration
   * Airflow (DAG, operators, scheduling)
   * Dagster / Prefect
* Data Quality & Governance
   * Data validation (Great Expectations)
   * Data lineage
   * Data catalog
   * Data contracts
   * Privacy & compliance (PII, GDPR)
* Databases
   * Relational vs NoSQL
   * Document, key-value, column-family, graph databases (Neo4j)
   * CAP theorem
   * Sharding & replication
* Data Pipeline System Design
   * Design a clickstream pipeline
   * Design a data warehouse for an e-commerce company
   * Design a real-time dashboard backend

## 17. Cloud, DevOps & DataOps

* Linux & Shell
   * File system, permissions
   * Common commands (grep, awk, sed, find)
   * Processes, ports
   * Bash scripting
   * SSH
* Git
   * Branching, merge vs rebase
   * Pull requests & code review
   * Resolving conflicts
* Networking Basics
   * HTTP/HTTPS, DNS, TCP/IP
   * Load balancers, reverse proxies
* Containers
   * Docker (image, container, Dockerfile, layers)
   * docker-compose
* Kubernetes
   * Pod, Deployment, Service
   * ConfigMap & Secret
   * Scaling
   * Helm
* CI/CD
   * GitHub Actions / Jenkins / GitLab CI
   * Pipeline stages: build, test, deploy
* Infrastructure as Code
   * Terraform
   * CloudFormation
* Cloud Platforms
   * AWS core services (EC2, S3, IAM, Lambda, RDS, SageMaker)
   * GCP core services (GCS, BigQuery, Vertex AI, Cloud Run)
   * Azure core services
   * Serverless vs VM vs container
* Observability
   * Logging, metrics, tracing
   * Prometheus, Grafana
   * SLA / SLO / SLI
* Security
   * IAM & least privilege
   * Secrets management
   * DevSecOps basics
* DataOps
   * Pipeline testing & CI for data
   * Environment management (dev / staging / prod)
   * Data observability

## 18. Data Analysis & BI

* Analytics Workflow
   * Define the business question
   * Data gathering & cleaning
   * EDA
   * Insight → recommendation
* Business Metrics
   * Revenue, ARPU, LTV, CAC
   * Retention, churn
   * Conversion funnels
   * Cohort analysis
   * Unit economics
* Dashboards & Reporting
   * KPI design
   * Dashboard design principles
   * Self-serve analytics
* BI Tools
   * Power BI (DAX, data modeling, Power Query)
   * Tableau (calculated fields, LOD expressions)
   * Looker (LookML)
* Excel / Google Sheets
   * Pivot tables
   * VLOOKUP / XLOOKUP / INDEX-MATCH
   * Basic modeling
* Data Storytelling
   * Communicating to non-technical stakeholders
   * Executive summaries
* Analytics Case Studies
   * "Metric X dropped 10% — why?"
   * Sizing / estimation (Fermi problems)
   * Root cause analysis

## 19. Product Sense, Metrics & AI PM

* Product Metrics
   * North star metric
   * Input vs output metrics
   * Counter / guardrail metrics
   * Metric frameworks (AARRR, HEART)
* Product Case Interviews
   * Define success for a feature
   * Diagnose a metric change
   * Evaluate a new feature launch
   * Trade-off questions
* AI Product Management
   * Identifying good AI use cases
   * Build vs buy vs fine-tune
   * Defining AI success metrics (quality, latency, cost)
   * Human-in-the-loop design
   * Responsible AI & risk
   * Writing a PRD for an AI feature
   * ROI of AI projects

## 20. Data Structures & Algorithms

* Complexity (Big-O, time & space)
* Arrays & Strings
* Hash Maps & Sets
* Two Pointers
* Sliding Window
* Stacks & Queues
* Linked Lists
* Binary Search
* Sorting (quick sort, merge sort)
* Heaps / Priority Queues
* Trees (BST, traversal)
* Graphs (BFS, DFS, topological sort)
* Recursion & Backtracking
* Dynamic Programming
* Intervals

## 21. Software Engineering for Data/AI

* Writing production-quality Python
   * Project structure, packaging
   * Virtual environments & dependency management (venv, conda, uv, poetry)
   * Logging & config management
* Testing
   * Unit tests (pytest)
   * Integration tests
   * Mocking
* APIs
   * REST principles
   * FastAPI / Flask
   * Authentication basics (OAuth, API keys, JWT)
* Backend Basics
   * Caching (Redis)
   * Message queues
   * Async processing
* System Design Basics
   * Scalability, availability
   * Monolith vs microservices
* Code Quality
   * Design patterns
   * Code review
   * Documentation

## 22. Consulting & Case Interviews

* Case frameworks (profitability, market entry, growth)
* Market sizing
* Structuring ambiguous problems
* Translating business problems into data/AI solutions
* AI strategy & maturity assessment
* Stakeholder management
* Presenting recommendations

## 23. Behavioral Interviews

* STAR method
* Tell me about yourself
* Why this company / role
* Project deep dive
* Conflict & disagreement
* Failure & learning
* Leadership & ownership
* Ambiguity
* Influencing without authority
* Prioritization under deadlines
* Questions to ask the interviewer
