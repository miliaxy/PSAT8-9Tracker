import {
  BookHeart,
  BookOpenCheck,
  Check,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Library,
  LockKeyhole,
} from 'lucide-react'
import { PageHeader, ProgressBar, StatCard } from '../components/ui'
import type { Book, LearningResourceUnit } from '../types/models'

interface BooksPageProps {
  books: Book[]
  resources: LearningResourceUnit[]
}

export function BooksPage({ books, resources }: BooksPageProps) {
  const khanUnits = resources.filter((resource) => resource.provider === 'Khan Academy')
  const prepUnits = resources.filter((resource) => resource.provider === 'Prep book')
  const currentBook = books.find((book) => book.category === 'Current')
  const resourceTrackCount = Number(khanUnits.length > 0) + Number(prepUnits.length > 0) + Number(books.length > 0)

  if (!books.length && !resources.length) {
    return (
      <>
        <PageHeader
          eyebrow="Learning resources"
          title="Books & learning path"
          description="Keep concept learning, prep-book work, and real reading moving together—without teaching topics out of sequence."
          action={<span className="library-chip"><Library size={16} /> Resource library</span>}
        />
        <section className="panel empty-data-panel">
          <Library size={25} />
          <h2>No resources assigned yet</h2>
          <p>Books, Khan Academy units, and prep-book chapters will appear here when they are added.</p>
        </section>
      </>
    )
  }

  const featuredBook = currentBook ?? books[0]
  const readingProgress = featuredBook ? Math.round((featuredBook.pagesRead / featuredBook.totalPages) * 100) : 0
  const khanProgress = khanUnits.length ? Math.round(khanUnits.reduce((sum, unit) => sum + unit.progress, 0) / khanUnits.length) : 0
  const prepProgress = prepUnits.length ? Math.round(prepUnits.reduce((sum, unit) => sum + unit.progress, 0) / prepUnits.length) : 0

  return (
    <>
      <PageHeader
        eyebrow="Learning resources"
        title="Books & learning path"
        description="Keep concept learning, prep-book work, and real reading moving together—without teaching topics out of sequence."
        action={<span className="library-chip"><Library size={16} /> {resourceTrackCount} resource {resourceTrackCount === 1 ? 'track' : 'tracks'}</span>}
      />

      <section className="stats-grid stats-grid--four">
        <StatCard label="Khan pathway" value={`${khanProgress}%`} detail={`${khanUnits.filter((unit) => unit.status === 'Completed').length} units completed`} icon={GraduationCap} tone="violet" />
        <StatCard label="Prep book" value={`${prepProgress}%`} detail="Chapters + end drills" icon={BookOpenCheck} tone="teal" />
        <StatCard label="Current read" value={`${readingProgress}%`} detail={featuredBook?.title ?? 'Not selected'} icon={BookHeart} tone="gold" />
        <StatCard label="Reading shelf" value={books.length} detail={books.length ? 'Independent books tracked' : 'No independent book added'} icon={Library} tone="blue" />
      </section>

      <section className="resource-grid">
        <article className="panel resource-panel">
          <div className="panel__header">
            <div><span className="eyebrow">Math concept sequence</span><h2>Khan Academy path</h2></div>
            <span className="resource-progress">{khanProgress}% complete</span>
          </div>
          <ProgressBar value={khanProgress} tone="violet" label="Khan Academy pathway progress" />
          <div className="resource-list">
            {khanUnits.map((unit) => <ResourceRow key={unit.id} resource={unit} />)}
          </div>
        </article>

        <article className="panel resource-panel">
          <div className="panel__header">
            <div><span className="eyebrow">Read + practice</span><h2>Prep-book chapters</h2></div>
            <span className="resource-progress">{prepProgress}% complete</span>
          </div>
          <ProgressBar value={prepProgress} tone="teal" label="Prep book progress" />
          <div className="resource-list">
            {prepUnits.map((unit) => <ResourceRow key={unit.id} resource={unit} />)}
          </div>
        </article>
      </section>

      <section className="panel reading-panel">
        <div className="panel__header">
          <div><span className="eyebrow">Reading stamina</span><h2>Independent reading shelf</h2></div>
          <span className="muted-caption">{books.length ? `${books.reduce((sum, book) => sum + book.weeklyGoalPages, 0)} weekly goal pages` : 'No reading goal yet'}</span>
        </div>
        {books.length ? <div className="book-grid">
          {books.map((book) => {
            const progress = Math.round((book.pagesRead / book.totalPages) * 100)
            return (
              <article className="book-card" key={book.id}>
                <div className="book-cover" style={{ '--book-accent': book.accent } as React.CSSProperties}>
                  <BookHeart size={24} />
                  <span>{book.category}</span>
                </div>
                <div className="book-card__body">
                  <span className="book-category">{book.category}</span>
                  <h3>{book.title}</h3>
                  <p className="book-author">by {book.author}</p>
                  <p className="book-note">{book.note}</p>
                  <div className="book-progress-row">
                    <ProgressBar value={progress} tone={book.category === 'Completed' ? 'teal' : 'gold'} label={`${book.title} reading progress`} />
                    <strong>{progress}%</strong>
                  </div>
                  <span className="page-count">{book.pagesRead} of {book.totalPages} pages</span>
                </div>
              </article>
            )
          })}
        </div> : <div className="no-detail">Independent reading has not been added yet.</div>}
      </section>
    </>
  )
}

function ResourceRow({ resource }: { resource: LearningResourceUnit }) {
  const isCompleted = resource.status === 'Completed'
  const isLocked = resource.status === 'Locked'

  return (
    <div className={`resource-row${isCompleted ? ' resource-row--completed' : ''}${isLocked ? ' resource-row--locked' : ''}`}>
      <span className="resource-row__state">
        {isCompleted ? <Check size={15} strokeWidth={3} /> : isLocked ? <LockKeyhole size={14} /> : resource.sequence}
      </span>
      <div className="resource-row__copy">
        <div><strong>{resource.title}</strong><span className={`resource-status resource-status--${resource.status.toLowerCase().replaceAll(' ', '-')}`}>{resource.status}</span></div>
        <p>{resource.note}</p>
        {resource.progress > 0 && resource.progress < 100 && <ProgressBar value={resource.progress} tone="gold" label={`${resource.title} progress`} />}
      </div>
      <span className="resource-row__progress">{resource.progress}%</span>
      {resource.url ? (
        <a
          className="resource-row__link"
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${resource.title}`}
          title={`Open ${resource.title}`}
        >
          <ExternalLink size={16} />
        </a>
      ) : <ChevronRight size={16} />}
    </div>
  )
}
