import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Raw HTML is not rendered (react-markdown default), so issue bodies can't inject markup.
export function Markdown({ children }: { readonly children: string }) {
  return (
    <div className="ui-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
