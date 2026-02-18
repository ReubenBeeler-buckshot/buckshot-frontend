import { ImageWithFallback } from './figma/ImageWithFallback';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-6">
        <div className="flex justify-start mb-8">
          <ImageWithFallback
            src="/logo.webp"
            alt="Buckshot Logo"
            className="w-32 h-32 object-cover shadow-[0px_0.1rem_10px_0.2rem_rgba(0,0,0,0.3)]"
          />
        </div>

        <h1 className="text-4xl font-bold">This is Project Buckshot</h1>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Welcome! I'm Reuben, and Buckshot is my hobby project for autonomously collecting wildlife photography. <br/>
						Do you ever have guests over and want to brag about how many deer walk on your property only to realize you have no evidence? <br/>
            That ends today. With Buckshot, photos from my backyard stream in every 5 minutes from a weather-protected Raspberry Pi camera
            and are screened daily for wildlife using SpeciesNet inference on AWS.
            Head on over to the <a href="/gallery" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">gallery</a> to view the photographed animals and their species!
          </p>
          <p>
            Alternatively, click <a href="https://github.com/ReubenBeeler-buckshot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">here</a> to see the source code on GitHub.
          </p>
          <p>
            More content coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}