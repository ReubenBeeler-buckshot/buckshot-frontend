# Buckshot Wildlife Gallery

A wildlife camera trap image gallery with automated species detection, hosted at [buckshot.reubenbeeler.me](https://buckshot.reubenbeeler.me).

## Features

- **Automated Image Gallery**: Daily updates at 10pm with new wildlife camera trap images
- **Species Detection**: AI-powered wildlife detection with species identification
- **Search & Filter**: Search by species name (common or scientific)
- **Smart Sorting**: Sort by date or number of animals detected
- **CloudFront CDN**: Fast image delivery via AWS CloudFront
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Routing**: React Router
- **CDN**: AWS CloudFront
- **Storage**: AWS S3
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

## Deployment

This site is automatically deployed to GitHub Pages via GitHub Actions whenever changes are pushed to the main branch.

### Setup Instructions

1. **GitHub Pages Configuration**:
   - Go to your repository Settings > Pages
   - Under "Build and deployment", set Source to "GitHub Actions"

2. **Squarespace DNS Configuration**:
   - Add a CNAME record pointing `buckshot` to `<your-github-username>.github.io`
   - GitHub Pages will automatically serve the site at `buckshot.reubenbeeler.me`

3. **AWS Configuration** (already set up):
   - S3 bucket: `buckshot-s3`
   - CloudFront distributions configured for image listing and delivery

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Build for production
pnpm run build
```

## Image Structure

- Images: `s3://buckshot-s3/validated/images/`
- Metadata: `s3://buckshot-s3/validated/metadata/`
- Filename format: `YYYY-MM-DD_HH:MM:SS.ffffff.jpg`
- Metadata format: `filename.jpg.json`

## License

Private project - All rights reserved
