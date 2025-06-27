# Accordion

Collapsible content sections that help organize and display information efficiently.

## Overview

The Accordion component allows users to expand and collapse content sections. It supports single or multiple active items, smooth animations, various visual styles, and full accessibility features including keyboard navigation and screen reader support.

## Import

```typescript
import { 
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent 
} from '@/components/ui/accordion'
```

## Basic Usage

### Single Selection

```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>
      Content for section 1. This can contain any HTML or React components.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Section 2</AccordionTrigger>
    <AccordionContent>
      Content for section 2 with different information.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### Multiple Selection

```tsx
<Accordion type="multiple">
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>
      Multiple sections can be open simultaneously.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Section 2</AccordionTrigger>
    <AccordionContent>
      This section can be open while others are also open.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

## Variants

### Visual Variants

```tsx
// Default with bottom borders
<Accordion variant="default" type="single" collapsible>
  {items.map((item) => (
    <AccordionItem key={item.value} value={item.value}>
      <AccordionTrigger>{item.title}</AccordionTrigger>
      <AccordionContent>{item.content}</AccordionContent>
    </AccordionItem>
  ))}
</Accordion>

// Bordered container
<Accordion variant="bordered" type="single" collapsible>
  {/* items */}
</Accordion>

// Ghost (no borders)
<Accordion variant="ghost" type="single" collapsible>
  {/* items */}
</Accordion>

// Separated items with individual borders
<Accordion variant="separated" type="single" collapsible>
  {/* items */}
</Accordion>
```

### Sizes

```tsx
// Small accordion
<Accordion size="sm" type="single" collapsible>
  {/* items */}
</Accordion>

// Default size
<Accordion size="default" type="single" collapsible>
  {/* items */}
</Accordion>

// Large accordion
<Accordion size="lg" type="single" collapsible>
  {/* items */}
</Accordion>
```

## Advanced Examples

### FAQ Section

```tsx
const faqData = [
  {
    question: "What is DomainFlow?",
    answer: "DomainFlow is a comprehensive domain management and lead generation platform designed specifically for telecom businesses."
  },
  {
    question: "How does the pricing work?",
    answer: "We offer flexible pricing plans based on your usage. Contact our sales team for a custom quote that fits your needs."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required."
  }
]

<div className="max-w-2xl mx-auto">
  <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
  <Accordion type="single" collapsible variant="separated" size="default">
    {faqData.map((faq, index) => (
      <AccordionItem key={index} value={`faq-${index}`}>
        <AccordionTrigger className="text-left">
          {faq.question}
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-muted-foreground">{faq.answer}</p>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
</div>
```

### Feature Overview

```tsx
const features = [
  {
    title: "Domain Generation",
    description: "Advanced algorithms for generating relevant domain names",
    details: "Our AI-powered system analyzes your business requirements and generates hundreds of relevant domain suggestions using sophisticated linguistic patterns and market data."
  },
  {
    title: "Lead Scoring",
    description: "Intelligent lead qualification and scoring",
    details: "Machine learning models analyze website content, traffic patterns, and business indicators to provide accurate lead scores and prioritization."
  },
  {
    title: "Campaign Management",
    description: "Comprehensive campaign tracking and optimization",
    details: "Track performance across multiple campaigns with detailed analytics, A/B testing capabilities, and automated optimization recommendations."
  }
]

<Accordion type="multiple" variant="bordered" size="lg">
  {features.map((feature, index) => (
    <AccordionItem key={index} value={`feature-${index}`}>
      <AccordionTrigger>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary">{index + 1}</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="ml-11">
          <p className="text-muted-foreground leading-relaxed">
            {feature.details}
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

### Settings Panel

```tsx
const SettingsAccordion = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Manage your account preferences and configurations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" variant="ghost" size="default">
          <AccordionItem value="profile">
            <AccordionTrigger>Profile Information</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
                <Button size="sm">Save Changes</Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notifications">
            <AccordionTrigger>Notification Preferences</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <Switch id="email-notifications" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <Switch id="push-notifications" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekly-digest">Weekly Digest</Label>
                  <Switch id="weekly-digest" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="security">
            <AccordionTrigger>Security Settings</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
                <Button variant="outline" size="sm">
                  Enable Two-Factor Authentication
                </Button>
                <Button variant="outline" size="sm">
                  View Login History
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
```

### Product Comparison

```tsx
const productComparison = [
  {
    category: "Core Features",
    items: [
      { feature: "Domain Generation", basic: true, pro: true, enterprise: true },
      { feature: "Lead Scoring", basic: false, pro: true, enterprise: true },
      { feature: "Campaign Management", basic: false, pro: true, enterprise: true }
    ]
  },
  {
    category: "Integrations",
    items: [
      { feature: "CRM Integration", basic: false, pro: true, enterprise: true },
      { feature: "API Access", basic: false, pro: "Limited", enterprise: "Full" },
      { feature: "Webhooks", basic: false, pro: false, enterprise: true }
    ]
  }
]

<Accordion type="multiple" variant="separated" size="default">
  {productComparison.map((category, index) => (
    <AccordionItem key={index} value={`category-${index}`}>
      <AccordionTrigger>{category.category}</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3">
          {category.items.map((item, itemIndex) => (
            <div key={itemIndex} className="grid grid-cols-4 gap-4 py-2 border-b last:border-b-0">
              <div className="font-medium">{item.feature}</div>
              <div className="text-center">
                {item.basic === true ? "✓" : item.basic === false ? "✗" : item.basic}
              </div>
              <div className="text-center">
                {item.pro === true ? "✓" : item.pro === false ? "✗" : item.pro}
              </div>
              <div className="text-center">
                {item.enterprise === true ? "✓" : item.enterprise === false ? "✗" : item.enterprise}
              </div>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

### Custom Icons

```tsx
<Accordion type="single" collapsible variant="separated">
  <AccordionItem value="item-1">
    <AccordionTrigger hideIcon>
      <div className="flex items-center space-x-3">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        <span>Important Notice</span>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      <Alert>
        <AlertDescription>
          This is an important system notification that requires your attention.
        </AlertDescription>
      </Alert>
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="item-2">
    <AccordionTrigger hideIcon>
      <div className="flex items-center space-x-3">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span>Completed Tasks</span>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Domain validation completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Lead scoring updated</span>
        </div>
      </div>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

## API Reference

### Accordion Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'single' \| 'multiple'` | - | Selection behavior |
| `collapsible` | `boolean` | `false` | Allow collapsing active item (single type only) |
| `value` | `string \| string[]` | - | Controlled active value(s) |
| `defaultValue` | `string \| string[]` | - | Default active value(s) |
| `onValueChange` | `(value) => void` | - | Value change handler |
| `variant` | `'default' \| 'bordered' \| 'ghost' \| 'separated'` | `'default'` | Visual variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Size variant |
| `disabled` | `boolean` | `false` | Disable all items |

### AccordionItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Unique item identifier |
| `disabled` | `boolean` | `false` | Disable this item |

### AccordionTrigger Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hideIcon` | `boolean` | `false` | Hide the chevron icon |

### AccordionContent Props

Standard content props, inherits size and variant from parent.

## Accessibility

- Full keyboard navigation (Tab, Enter, Space, Arrow keys)
- Proper ARIA attributes (expanded, controls, labelledby)
- Screen reader support with state announcements
- Focus management and visual indicators
- Supports assistive technology

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate between accordion triggers |
| `Enter/Space` | Toggle accordion item |
| `↓` | Move to next trigger |
| `↑` | Move to previous trigger |
| `Home` | Move to first trigger |
| `End` | Move to last trigger |

## Best Practices

### Do's
- Use descriptive trigger text
- Keep content sections focused and related
- Use consistent accordion patterns throughout the app
- Consider default open states for important content
- Provide clear visual hierarchy

### Don'ts
- Don't nest accordions too deeply
- Don't use accordions for critical navigation
- Don't make accordion triggers too complex
- Don't forget about mobile experience
- Don't hide essential information in collapsed state

## Design Tokens

```css
/* Accordion animations */
--accordion-animation-duration: 200ms;
--accordion-up: accordion-up 0.2s ease-out;
--accordion-down: accordion-down 0.2s ease-out;

/* Accordion spacing */
--accordion-trigger-padding-sm: 0.5rem 0;
--accordion-trigger-padding-default: 1rem 0;
--accordion-trigger-padding-lg: 1.5rem 0;

/* Accordion colors */
--accordion-border: hsl(var(--border));
--accordion-trigger-hover: underline;
--accordion-content-bg: transparent;
```

## Related Components

- [Card](./card.md) - Alternative content container
- [Tabs](./tabs.md) - Alternative content organization
- [Collapsible](../atomic/collapsible.md) - Single collapsible section
- [Dialog](../organism/dialog.md) - For detailed content
