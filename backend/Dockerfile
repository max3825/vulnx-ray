FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Go
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    curl \
    golang-go \
    && rm -rf /var/lib/apt/lists/*

# Install vulnx (ProjectDiscovery - Search)
RUN go install github.com/projectdiscovery/cvemap/cmd/vulnx@latest

# Add Go bin to PATH
ENV PATH="/root/go/bin:${PATH}"

# Nuclei Scanner - Disabled (focusing on CVE analysis only)
# RUN go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
