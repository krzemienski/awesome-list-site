import { Helmet } from "react-helmet";

export default function About() {
  return (
    <div className="flex flex-col max-w-3xl mx-auto">
      <Helmet>
        <title>About - Awesome List Static Site</title>
        <meta 
          name="description"
          content="Learn about the Awesome List Static Site project, its features, and how it works." 
        />
      </Helmet>
      
      <h1 className="text-3xl font-bold tracking-tight mb-6">About</h1>
      
      <div className="prose dark:prose-invert">
        <section className="mb-8">
          <h2>What is this?</h2>
          <p>
            Awesome List Static Site is an SEO-friendly, mobile-first website that transforms
            GitHub's curated "Awesome Lists" into beautiful, searchable websites.
          </p>
          <p>
            This project follows the tradition of the "awesome" repositories on GitHub,
            which are community-curated lists of resources on various technologies and topics.
          </p>
        </section>
        
        <section className="mb-8">
          <h2>Features</h2>
          <ul>
            <li>Responsive, mobile-first design</li>
            <li>Fast, static site generation</li>
            <li>Fuzzy search across all resources</li>
            <li>Multiple theme options</li>
            <li>Accessible navigation</li>
            <li>SEO optimized</li>
            <li>Keyboard shortcuts</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2>Technology</h2>
          <p>
            This site is built with modern web technologies:
          </p>
          <ul>
            <li>React for the UI components</li>
            <li>Tailwind CSS for styling</li>
            <li>shadcn/ui for component primitives</li>
            <li>Fuse.js for fuzzy search</li>
            <li>Framer Motion for animations</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2>Accessibility</h2>
          <p>
            This site is designed to be accessible to all users, following WCAG 2.1 AA guidelines.
            It includes:
          </p>
          <ul>
            <li>Proper heading structure</li>
            <li>Keyboard navigation</li>
            <li>Sufficient color contrast</li>
            <li>Appropriate ARIA attributes</li>
            <li>Respect for user motion preferences</li>
          </ul>
        </section>
        
        <section>
          <h2>Credits</h2>
          <p>
            This project was built with ❤️ using open source technologies.
            Special thanks to:
          </p>
          <ul>
            <li>
              <a href="https://github.com/sindresorhus/awesome" target="_blank" rel="noopener noreferrer">
                The Awesome List community
              </a>
            </li>
            <li>
              <a href="https://ui.shadcn.com/" target="_blank" rel="noopener noreferrer">
                shadcn/ui
              </a>
            </li>
            <li>
              <a href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer">
                Tailwind CSS
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
