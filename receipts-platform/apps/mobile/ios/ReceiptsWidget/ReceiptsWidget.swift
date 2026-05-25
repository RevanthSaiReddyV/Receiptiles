import WidgetKit
import SwiftUI

// MARK: - Card Recommendation Widget (Home Screen)

struct CardRecommendationEntry: TimelineEntry {
    let date: Date
    let merchantName: String
    let cardName: String
    let rewardRate: String
    let category: String
}

struct CardRecommendationProvider: TimelineProvider {
    func placeholder(in context: Context) -> CardRecommendationEntry {
        CardRecommendationEntry(
            date: Date(),
            merchantName: "Nearby Merchant",
            cardName: "Amex Gold",
            rewardRate: "4x",
            category: "Dining"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (CardRecommendationEntry) -> Void) {
        let entry = CardRecommendationEntry(
            date: Date(),
            merchantName: "Whole Foods",
            cardName: "Amex Gold",
            rewardRate: "4x Points",
            category: "Groceries"
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CardRecommendationEntry>) -> Void) {
        // In production, fetch from shared UserDefaults (App Group) or API
        let entry = CardRecommendationEntry(
            date: Date(),
            merchantName: "Starbucks",
            cardName: "Chase Freedom",
            rewardRate: "5% Back",
            category: "Dining"
        )
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
        completion(timeline)
    }
}

struct CardRecommendationWidgetView: View {
    var entry: CardRecommendationEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            smallWidget
        case .systemMedium:
            mediumWidget
        case .accessoryRectangular:
            lockScreenWidget
        case .accessoryCircular:
            lockScreenCircular
        default:
            smallWidget
        }
    }

    // MARK: - Small Widget (Home Screen)
    var smallWidget: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "creditcard.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(hex: "006d36"))
                Text("Best Card")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: "747874"))
            }

            Spacer()

            Text(entry.cardName)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(hex: "101814"))

            Text(entry.rewardRate)
                .font(.system(size: 28, weight: .heavy))
                .foregroundColor(Color(hex: "006d36"))

            Text("for \(entry.category)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color(hex: "747874"))
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(hex: "faf9f5"))
    }

    // MARK: - Medium Widget (Home Screen)
    var mediumWidget: some View {
        HStack(spacing: 16) {
            // Left: Card recommendation
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Circle()
                        .fill(Color(hex: "89f6a6"))
                        .frame(width: 8, height: 8)
                    Text("Use Now")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color(hex: "006d36"))
                }

                Text(entry.cardName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Color(hex: "101814"))

                Text(entry.rewardRate)
                    .font(.system(size: 32, weight: .heavy))
                    .foregroundColor(Color(hex: "006d36"))

                Text("at \(entry.merchantName)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(hex: "747874"))
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Right: Quick stats
            VStack(alignment: .trailing, spacing: 12) {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("This Month")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "747874"))
                    Text("$142")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(hex: "101814"))
                    Text("earned")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "006d36"))
                }

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Optimization")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "747874"))
                    Text("78%")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(Color(hex: "006d36"))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "faf9f5"))
    }

    // MARK: - Lock Screen Rectangular
    var lockScreenWidget: some View {
        HStack(spacing: 8) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 14))
            VStack(alignment: .leading, spacing: 2) {
                Text("Use \(entry.cardName)")
                    .font(.system(size: 13, weight: .semibold))
                Text("\(entry.rewardRate) at \(entry.category)")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Lock Screen Circular
    var lockScreenCircular: some View {
        VStack(spacing: 2) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 16, weight: .medium))
            Text(entry.rewardRate)
                .font(.system(size: 11, weight: .bold))
        }
    }
}

// MARK: - Spending Insights Widget

struct SpendingInsightEntry: TimelineEntry {
    let date: Date
    let totalSpent: Double
    let budgetUsed: Int
    let topCategory: String
    let topCategoryAmount: Double
}

struct SpendingInsightProvider: TimelineProvider {
    func placeholder(in context: Context) -> SpendingInsightEntry {
        SpendingInsightEntry(date: Date(), totalSpent: 2450, budgetUsed: 75, topCategory: "Dining", topCategoryAmount: 850)
    }

    func getSnapshot(in context: Context, completion: @escaping (SpendingInsightEntry) -> Void) {
        completion(SpendingInsightEntry(date: Date(), totalSpent: 2450, budgetUsed: 75, topCategory: "Dining", topCategoryAmount: 850))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SpendingInsightEntry>) -> Void) {
        let entry = SpendingInsightEntry(date: Date(), totalSpent: 2450, budgetUsed: 75, topCategory: "Dining", topCategoryAmount: 850)
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60 * 60)))
        completion(timeline)
    }
}

struct SpendingInsightWidgetView: View {
    var entry: SpendingInsightEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryRectangular:
            lockScreenSpending
        case .accessoryCircular:
            lockScreenBudgetRing
        default:
            homeScreenSpending
        }
    }

    var homeScreenSpending: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "006d36"))
                Text("Spending")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: "747874"))
            }

            Spacer()

            Text("$\(Int(entry.totalSpent))")
                .font(.system(size: 28, weight: .heavy))
                .foregroundColor(Color(hex: "101814"))

            Text("this month")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "747874"))

            // Mini progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: "e3e2df"))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: "6fdc8f"))
                        .frame(width: geo.size.width * CGFloat(entry.budgetUsed) / 100, height: 6)
                }
            }
            .frame(height: 6)

            Text("\(entry.budgetUsed)% of budget")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(hex: "006d36"))
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(hex: "faf9f5"))
    }

    var lockScreenSpending: some View {
        HStack(spacing: 8) {
            Image(systemName: "chart.bar.fill")
                .font(.system(size: 14))
            VStack(alignment: .leading, spacing: 2) {
                Text("$\(Int(entry.totalSpent)) spent")
                    .font(.system(size: 13, weight: .semibold))
                Text("\(entry.budgetUsed)% budget used")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }

    var lockScreenBudgetRing: some View {
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.3), lineWidth: 4)
            Circle()
                .trim(from: 0, to: CGFloat(entry.budgetUsed) / 100)
                .stroke(Color.primary, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(entry.budgetUsed)%")
                .font(.system(size: 12, weight: .bold))
        }
    }
}

// MARK: - Widget Bundle

@main
struct ReceiptsWidgetBundle: WidgetBundle {
    var body: some Widget {
        CardRecommendationWidget()
        SpendingInsightWidget()
    }
}

struct CardRecommendationWidget: Widget {
    let kind = "CardRecommendation"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CardRecommendationProvider()) { entry in
            CardRecommendationWidgetView(entry: entry)
        }
        .configurationDisplayName("Best Card")
        .description("Shows the best card to use at nearby merchants.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

struct SpendingInsightWidget: Widget {
    let kind = "SpendingInsight"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SpendingInsightProvider()) { entry in
            SpendingInsightWidgetView(entry: entry)
        }
        .configurationDisplayName("Spending")
        .description("Quick view of your monthly spending and budget progress.")
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryCircular])
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
