package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

func main() {
	// Sample HTML from the login page
	html := `<form class="space-y-4">
		<div class="space-y-2">
			<label class="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200 text-foreground text-sm font-medium" for="email">Email</label>
			<div class="space-y-1">
				<input type="email" class="flex w-full rounded-md border px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 md:text-sm border-input bg-input h-10" id="email" placeholder="Enter your email" value=""/>
			</div>
		</div>
		<div class="space-y-2">
			<label class="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200 text-foreground text-sm font-medium" for="password">Password</label>
			<div class="relative">
				<div class="space-y-1">
					<input type="password" class="flex w-full rounded-md border px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 md:text-sm border-input bg-input h-10 pr-10" id="password" placeholder="Enter your password" value=""/>
				</div>
				<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground rounded-md absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" aria-disabled="false" type="button">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye h-4 w-4" aria-hidden="true">
						<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
						<circle cx="12" cy="12" r="3"></circle>
					</svg>
				</button>
			</div>
		</div>
		<div class="flex items-center space-x-2">
			<button type="button" role="checkbox" aria-checked="false" data-state="unchecked" value="on" class="peer shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-4 w-4" id="rememberMe"></button>
			<input type="checkbox" aria-hidden="true" tabindex="-1" style="position:absolute;pointer-events:none;opacity:0;margin:0;transform:translateX(-100%)" value="on"/>
			<label class="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200 text-foreground font-medium text-sm" for="rememberMe">Remember me</label>
		</div>
		<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full" aria-disabled="false" type="submit">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield mr-2 h-4 w-4" aria-hidden="true">
				<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
			</svg>
			Sign in Securely
		</button>
	</form>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		log.Fatal(err)
	}

	selectors := []string{
		"input",
		"button",
		"form",
		"label",
		"[role]",
		"[id]",
	}

	fmt.Println("=== Testing element detection ===")

	for _, selector := range selectors {
		fmt.Printf("\nSelector: %s\n", selector)
		doc.Find(selector).Each(func(i int, s *goquery.Selection) {
			fmt.Printf("  Found: <%s", goquery.NodeName(s))
			if id := s.AttrOr("id", ""); id != "" {
				fmt.Printf(" id=\"%s\"", id)
			}
			if role := s.AttrOr("role", ""); role != "" {
				fmt.Printf(" role=\"%s\"", role)
			}
			if inputType := s.AttrOr("type", ""); inputType != "" {
				fmt.Printf(" type=\"%s\"", inputType)
			}
			fmt.Printf(">\n")
		})
	}
}
