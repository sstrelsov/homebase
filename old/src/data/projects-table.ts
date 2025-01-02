interface Project {
  key: string;
  name: string;
  slug: string;
  date: string;
  isDraft?: boolean;
}

export const projects: Project[] = [
  {
    key: "1",
    name: "The Globe",
    slug: "earth",
    date: "12/22/24",
    isDraft: false,
  },
  {
    key: "2",
    name: "A Conversation at Cafe Belle",
    slug: "cafe-belle",
    date: "12/30/24",
    isDraft: true,
  },
];

export const columns = [
  {
    key: "name",
    label: "NAME",
  },
  {
    key: "date",
    label: "DATE",
  },
];
