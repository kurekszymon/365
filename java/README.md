# java

# 11.03

- app is now seperated to controller/service folders, which is preferred according to Sonnet - will do some additional research over next few days on how to structure Spring Boot project
- entities should be stored under `model/` and JPA repos should be placed under `repository`
- to enable hot reloading - `spring-boot-devtools` are needed. run `gradlew bootRun` and `gradlew classes -t` in seperate terminal