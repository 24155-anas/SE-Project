# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

# Create a non-root user (UID 1000) for security and Hugging Face compatibility
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set the working directory in the container
WORKDIR $HOME/app

# Copy requirements file first to leverage Docker cache
COPY --chown=user backend/requirements.txt $HOME/app/backend/requirements.txt

# Install python dependencies
RUN pip install --no-cache-dir --user -r backend/requirements.txt

# Copy the rest of the application code
COPY --chown=user backend $HOME/app/backend
COPY --chown=user frontend $HOME/app/frontend

# Expose port
EXPOSE 7860

# Start FastAPI application
CMD uvicorn backend.main:app --host 0.0.0.0 --port 7860
